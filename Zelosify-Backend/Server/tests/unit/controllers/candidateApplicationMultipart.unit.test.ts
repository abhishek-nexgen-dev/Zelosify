import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    opening: { findUnique: vi.fn() },
    hiringProfile: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    opening: { findFirst: vi.fn() },
    hiringProfile: { findFirst: vi.fn(), create: vi.fn() },
  },
  storage: {
    putObject: vi.fn(),
  },
  trigger: vi.fn(),
  inspectResumeBuffer: vi.fn(),
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({ createStorageService: () => mocks.storage }));
vi.mock("../../../src/services/ai/recommendationService.js", () => ({ triggerAsyncRecommendation: mocks.trigger }));
vi.mock("../../../src/services/ai/tools/resumeParser.js", () => ({
  inspectResumeBuffer: mocks.inspectResumeBuffer,
  MAX_RESUME_PAGES: 2,
  MAX_RESUME_TEXT_CHARACTERS: 12000,
}));

import { applyForJob } from "../../../src/controllers/candidate/candidateController.js";

function makeResponse() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

function makeRequest(file?: Record<string, unknown>) {
  return {
    user: { id: "candidate-42", tenantId: "tenant-9", role: "CANDIDATE" },
    params: { id: "opening-5" },
    body: {},
    ...(file ? { file } : {}),
  } as any;
}

describe("single multipart job application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inspectResumeBuffer.mockResolvedValue({ pageCount: 1, characterCount: 100 });
    mocks.prisma.opening.findUnique.mockResolvedValue({ id: "opening-5", status: "OPEN" });
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue(null);
    mocks.prisma.$transaction.mockImplementation((callback: (transaction: typeof mocks.tx) => unknown) => callback(mocks.tx));
    mocks.tx.opening.findFirst.mockResolvedValue({ id: "opening-5", status: "OPEN" });
    mocks.tx.hiringProfile.findFirst.mockResolvedValue(null);
    mocks.tx.hiringProfile.create.mockImplementation(({ data }: { data: { s3Key: string } }) => Promise.resolve({
      id: 31,
      s3Key: data.s3Key,
      status: "SUBMITTED",
      submittedAt: new Date("2026-11-16T10:00:00.000Z"),
      recommendationStatus: "PENDING",
      opening: { title: "Backend Engineer", location: "Remote", contractType: "Full-time" },
    }));
  });

  it.each([
    ["resume.pdf", "application/pdf", Buffer.from("%PDF-1.7 resume bytes")],
    ["resume.doc", "application/msword", Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
    ["resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])],
  ])("stores and submits a valid %s using the authenticated candidate scope", async (filename, mimetype, buffer) => {
    const file = { originalname: filename, mimetype, size: buffer.length, buffer };
    const response = makeResponse();

    await applyForJob(makeRequest(file), response);

    expect(mocks.storage.putObject).toHaveBeenCalledWith(
      expect.stringMatching(/^candidate-resumes\/tenant-9\/candidate-42\//), buffer, mimetype,
    );
    const storedKey = mocks.storage.putObject.mock.calls[0][0];
    expect(mocks.tx.hiringProfile.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        s3Key: storedKey, uploadedBy: "candidate-42", openingId: "opening-5", status: "SUBMITTED",
      }),
    }));
    expect(mocks.trigger).toHaveBeenCalledWith(31);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ screeningStatus: "PENDING", applicationId: 31 }),
    }));
  });

  it("accepts a fresh upload of the same file for a different opening and creates a separate resume object", async () => {
    const resumeBuffer = Buffer.from("%PDF-1.7 same candidate resume");
    const file = { originalname: "resume.pdf", mimetype: "application/pdf", size: resumeBuffer.length, buffer: resumeBuffer };
    const firstResponse = makeResponse();
    await applyForJob(makeRequest(file), firstResponse);

    const secondRequest = makeRequest(file);
    secondRequest.params.id = "opening-6";
    const secondResponse = makeResponse();
    await applyForJob(secondRequest, secondResponse);

    const storedKeys = mocks.storage.putObject.mock.calls.map(([key]) => key);
    expect(storedKeys).toHaveLength(2);
    expect(new Set(storedKeys).size).toBe(2);
    expect(mocks.tx.hiringProfile.create).toHaveBeenCalledTimes(2);
    expect(mocks.trigger).toHaveBeenCalledTimes(2);
    expect(firstResponse.status).toHaveBeenCalledWith(201);
    expect(secondResponse.status).toHaveBeenCalledWith(201);
  });

  it("accepts exactly 2 pages and 12,000 extracted characters", async () => {
    mocks.inspectResumeBuffer.mockResolvedValueOnce({ pageCount: 2, characterCount: 12000 });
    const file = { originalname: "resume.pdf", mimetype: "application/pdf", size: 20, buffer: Buffer.from("%PDF-1.7 resume bytes") };
    const response = makeResponse();

    await applyForJob(makeRequest(file), response);

    expect(response.status).toHaveBeenCalledWith(201);
    expect(mocks.storage.putObject).toHaveBeenCalledOnce();
    expect(mocks.trigger).toHaveBeenCalledWith(31);
  });

  it("rejects an unsupported extension or mismatched signature before storage", async () => {
    const response = makeResponse();
    await applyForJob(makeRequest({
      originalname: "resume.pdf", mimetype: "application/pdf", size: 10, buffer: Buffer.from("not a PDF"),
    }), response);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
    expect(mocks.tx.hiringProfile.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ pageCount: 3, characterCount: 7000 }, "2 pages"],
    [{ pageCount: 2, characterCount: 12001 }, "12,000 characters"],
    [{ pageCount: null, characterCount: 100 }, "verify this file's page count"],
  ])("rejects a resume that exceeds or cannot verify upload content limits", async (inspection, expectedMessage) => {
    mocks.inspectResumeBuffer.mockResolvedValueOnce(inspection);
    const response = makeResponse();

    await applyForJob(makeRequest({
      originalname: "resume.pdf", mimetype: "application/pdf", size: 20, buffer: Buffer.from("%PDF-1.7 resume bytes"),
    }), response);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining(expectedMessage) }));
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
    expect(mocks.tx.hiringProfile.create).not.toHaveBeenCalled();
  });

  it.each([
    { originalname: "resume.exe", mimetype: "application/pdf", size: 9, buffer: Buffer.from("%PDF-1.7") },
    { originalname: "resume.doc", mimetype: "application/pdf", size: 9, buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0]) },
    { originalname: "resume.pdf", mimetype: "application/pdf", size: 10 * 1024 * 1024 + 1, buffer: Buffer.from("%PDF-1.7") },
  ])("rejects disallowed type, mismatched MIME, or oversized file before storage", async (file) => {
    const response = makeResponse();
    await applyForJob(makeRequest(file), response);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects duplicate applications before uploading another resume", async () => {
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue({ id: 18 });
    const response = makeResponse();
    await applyForJob(makeRequest({
      originalname: "resume.pdf", mimetype: "application/pdf", size: 20, buffer: Buffer.from("%PDF-1.7 resume bytes"),
    }), response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
    expect(mocks.tx.hiringProfile.create).not.toHaveBeenCalled();
  });

  it("requires a fresh multipart file and rejects a previously stored key", async () => {
    const request = makeRequest();
    request.body = { s3Key: "candidate-resumes/tenant-9/candidate-42/resume.pdf" };
    const response = makeResponse();

    await applyForJob(request, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
    expect(mocks.tx.hiringProfile.create).not.toHaveBeenCalled();
  });
});
