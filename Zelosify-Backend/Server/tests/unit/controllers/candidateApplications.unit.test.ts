import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { hiringProfile: { groupBy: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() } },
  storage: { getObjectURL: vi.fn() },
  trigger: vi.fn(),
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({ createStorageService: () => mocks.storage }));
vi.mock("../../../src/services/ai/recommendationService.js", () => ({ triggerAsyncRecommendation: mocks.trigger }));

import { getMyApplications, retryMyApplicationAnalysis } from "../../../src/controllers/candidate/candidateController.js";

function makeResponse() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

function makeApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    s3Key: "candidate-resumes/tenant-9/candidate-42/resume.pdf",
    status: "SUBMITTED",
    recommendationStatus: "COMPLETED",
    recommended: true,
    recommendationScore: 0.82,
    recommendationConfidence: 0.81,
    recommendationReason: "Your experience and skills align with this role.",
    recommendationLatencyMs: 950,
    recommendationVersion: "v1.2.0",
    atsScore: 82,
    submittedAt: new Date("2026-11-16T10:00:00.000Z"),
    opening: {
      id: "opening-1",
      title: "Senior Software Engineer",
      location: "Remote",
      contractType: "Full-Time",
      tenant: { companyName: "Example Org" },
    },
    ...overrides,
  };
}

function makeRequest(userId?: string) {
  return {
    user: userId ? { id: userId, role: "CANDIDATE" } : undefined,
    query: { page: "1", limit: "20" },
  } as any;
}

describe("GET /candidate/applications AI screening fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.hiringProfile.groupBy.mockResolvedValue([
      { status: "SUBMITTED", recommendationStatus: "COMPLETED", _count: { _all: 1 } },
      { status: "SHORTLISTED", recommendationStatus: "PROCESSING", _count: { _all: 1 } },
      { status: "REJECTED", recommendationStatus: "FAILED", _count: { _all: 1 } },
    ]);
    mocks.prisma.hiringProfile.findMany.mockResolvedValue([makeApplication()]);
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue({ id: 42, recommendationStatus: "FAILED", recommendationAttempts: 1 });
    mocks.storage.getObjectURL.mockResolvedValue("https://storage.example/resume");
  });

  it("returns saved score details for only the authenticated candidate's applications", async () => {
    const response = makeResponse();

    await getMyApplications(makeRequest("candidate-42"), response);

    expect(mocks.prisma.hiringProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { uploadedBy: "candidate-42", isDeleted: false },
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      count: 3,
      summary: { total: 3, inReview: 1, shortlisted: 1, screening: 1 },
      data: [expect.objectContaining({
        applicationId: 42,
        analysisRetryAvailable: false,
        aiScreening: {
          status: "COMPLETED",
          recommended: true,
          band: "Recommended",
          score: 82,
          confidence: 81,
          reason: "Your experience and skills align with this role.",
          latencyMs: 950,
          version: "v1.2.0",
          atsScore: 82,
        },
      })],
    }));
    expect(response.json.mock.calls[0][0].data[0]).not.toHaveProperty("resumeKey");
  });

  it("does not expose stale scores while screening is processing or failed", async () => {
    mocks.prisma.hiringProfile.findMany.mockResolvedValue([
      makeApplication({ id: 43, recommendationStatus: "PROCESSING" }),
      makeApplication({
        id: 44,
        recommendationStatus: "FAILED",
        recommendationMetadata: { failure: { errorCode: "RESUME_IDENTITY_MISMATCH" } },
      }),
    ]);
    const response = makeResponse();

    await getMyApplications(makeRequest("candidate-42"), response);

    const body = response.json.mock.calls[0][0];
    expect(body.data.map((application: any) => application.aiScreening)).toEqual([
      {
        status: "PROCESSING",
        recommended: null,
        band: "Analyzing",
        score: null,
        confidence: null,
        reason: null,
        latencyMs: null,
        version: null,
        atsScore: null,
      },
      {
        status: "FAILED",
        recommended: null,
        band: "Analysis unavailable",
        score: null,
        confidence: null,
        reason: "The name on this resume could not be verified against your candidate profile. Check your profile name and replace the resume to request a fresh analysis.",
        latencyMs: null,
        version: null,
        atsScore: null,
      },
    ]);
    expect(body.data[1].analysisIssue).toBe("IDENTITY_UNVERIFIED");
  });

  it("requires candidate authentication before reading applications", async () => {
    const response = makeResponse();

    await getMyApplications(makeRequest(), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(mocks.prisma.hiringProfile.findMany).not.toHaveBeenCalled();
  });
});

describe("POST /candidate/applications/:id/retry-analysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queues a retry for the candidate-owned failed application without changing its resume", async () => {
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue({ id: 42, recommendationStatus: "FAILED", recommendationAttempts: 1 });
    const response = makeResponse();

    await retryMyApplicationAnalysis({ user: { id: "candidate-42" }, params: { id: "42" } } as any, response);

    expect(mocks.prisma.hiringProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42, uploadedBy: "candidate-42", isDeleted: false },
    }));
    expect(mocks.trigger).toHaveBeenCalledWith(42);
    expect(response.status).toHaveBeenCalledWith(202);
  });

  it("enforces the analysis attempt limit", async () => {
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue({ id: 42, recommendationStatus: "FAILED", recommendationAttempts: 3 });
    const response = makeResponse();

    await retryMyApplicationAnalysis({ user: { id: "candidate-42" }, params: { id: "42" } } as any, response);

    expect(mocks.trigger).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(429);
  });
});
