import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    hiringProfile: { findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), groupBy: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    hiringProfile: { findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    storageDeletion: { upsert: vi.fn() },
  },
  storage: { putObject: vi.fn(), deleteObject: vi.fn(), getObjectMetadata: vi.fn(), getObjectStream: vi.fn() },
  trigger: vi.fn(),
  enqueue: vi.fn(),
  scheduleCleanup: vi.fn(),
  inspectResumeBuffer: vi.fn(),
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({ createStorageService: () => mocks.storage }));
vi.mock("../../../src/services/ai/recommendationService.js", () => ({ triggerAsyncRecommendation: mocks.trigger }));
vi.mock("../../../src/services/storage/storageCleanupService.js", () => ({
  enqueueStorageDeletion: mocks.enqueue,
  scheduleStorageCleanup: mocks.scheduleCleanup,
}));
vi.mock("../../../src/services/ai/tools/resumeParser.js", () => ({
  inspectResumeBuffer: mocks.inspectResumeBuffer,
  MAX_RESUME_PAGES: 2,
  MAX_RESUME_TEXT_CHARACTERS: 12000,
}));

import { revokeApplication, updateResume } from "../../../src/controllers/candidate/candidateController.js";

function makeResponse() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

function makeRequest(file?: Record<string, unknown>) {
  return {
    user: { id: "candidate-42", tenantId: "tenant-9", role: "CANDIDATE" },
    params: { id: "31" },
    body: {},
    ...(file ? { file } : {}),
  } as any;
}

describe("candidate application resume lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inspectResumeBuffer.mockResolvedValue({ pageCount: 1, characterCount: 100 });
    mocks.prisma.$transaction.mockImplementation((callback: (transaction: typeof mocks.tx) => unknown) => callback(mocks.tx));
    mocks.tx.hiringProfile.findFirst.mockResolvedValue({ id: 31, s3Key: "candidate-resumes/tenant-9/candidate-42/old.pdf" });
    mocks.tx.hiringProfile.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.hiringProfile.deleteMany.mockResolvedValue({ count: 1 });
    mocks.tx.storageDeletion.upsert.mockResolvedValue({ id: "cleanup-1" });
    mocks.enqueue.mockResolvedValue(undefined);
    mocks.storage.putObject.mockResolvedValue({ message: "uploaded" });
    mocks.storage.deleteObject.mockResolvedValue(undefined);
    mocks.prisma.hiringProfile.groupBy.mockResolvedValue([]);
  });

  it("replaces the resume on the existing application and resets AI data for a fresh analysis", async () => {
    const file = {
      originalname: "new-resume.pdf",
      mimetype: "application/pdf",
      size: 24,
      buffer: Buffer.from("%PDF-1.7 replacement resume"),
    };
    const response = makeResponse();

    await updateResume(makeRequest(file), response);

    const newKey = mocks.storage.putObject.mock.calls[0][0] as string;
    expect(newKey).toMatch(/^candidate-resumes\/tenant-9\/candidate-42\//);
    expect(mocks.tx.hiringProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 31, uploadedBy: "candidate-42", s3Key: "candidate-resumes/tenant-9/candidate-42/old.pdf" }),
      data: expect.objectContaining({
        s3Key: newKey,
        recommendationStatus: "PENDING",
        recommendationAttempts: 0,
        recommendationRunId: null,
        recommendationScore: null,
        recommendationMetadata: expect.anything(),
        status: "SUBMITTED",
      }),
    }));
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), "candidate-resumes/tenant-9/candidate-42/old.pdf");
    expect(mocks.trigger).toHaveBeenCalledWith(31);
    expect(mocks.scheduleCleanup).toHaveBeenCalledOnce();
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: { applicationId: 31, screeningStatus: "PENDING", storageCleanup: "PENDING" },
    }));
  });

  it("rejects unsupported resume types without uploading or modifying the application", async () => {
    const response = makeResponse();
    await updateResume(makeRequest({
      originalname: "resume.pptx",
      mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: 20,
      buffer: Buffer.from("PK\u0003\u0004not-a-resume"),
    }), response);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("rejects a replacement resume over the two-page limit before storage or DB changes", async () => {
    mocks.inspectResumeBuffer.mockResolvedValueOnce({ pageCount: 3, characterCount: 7000 });
    const response = makeResponse();

    await updateResume(makeRequest({
      originalname: "resume.pdf", mimetype: "application/pdf", size: 24, buffer: Buffer.from("%PDF-1.7 replacement resume"),
    }), response);

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("2 pages") }));
    expect(mocks.storage.putObject).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("does not change the application when replacement storage fails", async () => {
    mocks.storage.putObject.mockRejectedValueOnce(new Error("provider unavailable"));
    const response = makeResponse();

    await updateResume(makeRequest({
      originalname: "new-resume.pdf",
      mimetype: "application/pdf",
      size: 24,
      buffer: Buffer.from("%PDF-1.7 replacement resume"),
    }), response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.trigger).not.toHaveBeenCalled();
  });

  it("hard-deletes only the candidate-owned application and returns refreshed counts", async () => {
    mocks.prisma.hiringProfile.groupBy.mockResolvedValue([
      { status: "SUBMITTED", recommendationStatus: "COMPLETED", _count: { _all: 1 } },
      { status: "SHORTLISTED", recommendationStatus: "PROCESSING", _count: { _all: 1 } },
    ]);
    const response = makeResponse();

    await revokeApplication(makeRequest(), response);

    expect(mocks.tx.hiringProfile.deleteMany).toHaveBeenCalledWith({
      where: {
        id: 31,
        uploadedBy: "candidate-42",
        isDeleted: false,
        s3Key: "candidate-resumes/tenant-9/candidate-42/old.pdf",
      },
    });
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), "candidate-resumes/tenant-9/candidate-42/old.pdf");
    expect(mocks.scheduleCleanup).toHaveBeenCalledOnce();
    expect(mocks.prisma.hiringProfile.groupBy).toHaveBeenCalledOnce();
    expect(response.status).toHaveBeenCalledWith(202);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: {
        applicationId: 31,
        storageCleanup: "PENDING",
        summary: { total: 2, inReview: 1, shortlisted: 1, screening: 1 },
      },
    }));
  });

  it("does not enqueue resume deletion when the candidate does not own the application", async () => {
    mocks.tx.hiringProfile.findFirst.mockResolvedValueOnce(null);
    const response = makeResponse();

    await revokeApplication(makeRequest(), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(mocks.tx.hiringProfile.deleteMany).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.prisma.hiringProfile.groupBy).not.toHaveBeenCalled();
  });

  it("keeps a successful revoke successful if refreshing counts temporarily fails", async () => {
    mocks.prisma.hiringProfile.groupBy.mockRejectedValue(new Error("temporary database read failure"));
    const response = makeResponse();

    await revokeApplication(makeRequest(), response);

    expect(mocks.tx.hiringProfile.deleteMany).toHaveBeenCalledOnce();
    expect(response.status).toHaveBeenCalledWith(202);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ applicationId: 31, summary: null }),
    }));
  });
});
