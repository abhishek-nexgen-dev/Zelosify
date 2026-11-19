import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";

const mocks = vi.hoisted(() => ({
  prisma: {
    hiringProfile: { findUnique: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: { hiringProfile: { updateMany: vi.fn() } },
  storage: { getObjectStream: vi.fn() },
  runAgent: vi.fn(),
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({ createStorageService: () => mocks.storage }));
vi.mock("../../../src/services/ai/agentOrchestrator.js", () => ({
  runRecommendationAgent: mocks.runAgent,
  RecommendationProviderError: class extends Error {
    constructor(readonly message: string, readonly errorCode: string, readonly provider: string, readonly model: string, readonly httpStatus?: number) { super(message); }
  },
  ResumeIdentityMismatchError: class extends Error {
    readonly errorCode = "RESUME_IDENTITY_MISMATCH";
    constructor() { super("Resume identity mismatch"); }
  },
  RecommendationToolExecutionError: class extends Error {
    constructor(readonly errorCode: string) { super("Recommendation tool execution failed"); }
  },
}));

import { processProfileRecommendation } from "../../../src/services/ai/recommendationService.js";
import { RecommendationProviderError } from "../../../src/services/ai/agentOrchestrator.js";

describe("persisted AI resume analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.hiringProfile.findUnique.mockResolvedValue({
      id: 7,
      uploadedBy: "candidate-42",
      s3Key: "candidate-resumes/tenant-9/candidate-42/resume.pdf",
      isDeleted: false,
      opening: { experienceMin: 4, experienceMax: 8, location: "Remote", requiredSkills: ["React"] },
    });
    mocks.prisma.user.findUnique.mockResolvedValue({ role: "CANDIDATE", firstName: "Sam", lastName: "Candidate" });
    mocks.prisma.hiringProfile.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.hiringProfile.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.$transaction.mockImplementation((callback: (transaction: typeof mocks.tx) => unknown) => callback(mocks.tx));
    mocks.storage.getObjectStream.mockResolvedValue(Readable.from([Buffer.from("resume bytes")]));
    mocks.runAgent.mockResolvedValue({
      recommended: true,
      score: 0.82,
      confidence: 0.81,
      atsScore: 82,
      reason: "The resume covers the key skills and experience. This is decision support.",
      latencyMs: 750,
      version: "test-agent-v1",
      candidateName: "Sam Candidate",
      metadata: {
        model: "test-model",
        provider: "test-provider",
        startTime: "2026-11-16T10:00:00.000Z",
        tokenUsage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 },
        toolExecutions: [{ name: "parse_resume", durationMs: 10, status: "COMPLETED" }],
        extractedFeatures: {
          experienceYears: 5,
          skills: ["React", "TypeScript"],
          normalizedSkills: ["react", "typescript"],
          location: "Remote",
          education: ["Bachelor's Degree"],
          keywords: ["React", "TypeScript"],
        },
        matchingResult: { skillMatchScore: 1, experienceMatchScore: 1, locationMatchScore: 0.5, finalScore: 0.82 },
      },
    });
  });

  it("stores recommendation scores, factor breakdown, and validated extracted facts", async () => {
    await processProfileRecommendation(7);

    const persistedData = mocks.tx.hiringProfile.updateMany.mock.calls[0][0].data;
    expect(persistedData).toEqual(expect.objectContaining({
      recommendationScore: 0.82,
      recommendationConfidence: 0.81,
      atsScore: 82,
      recommendationStatus: "COMPLETED",
      atsBreakdown: {
        scale: 100,
        skillMatch: 100,
        experienceMatch: 100,
        locationMatch: 50,
        formula: "50% skills + 30% experience + 20% location",
      },
      resumeAnalysis: expect.objectContaining({
        candidateName: "Sam Candidate",
        experienceYears: 5,
        skills: ["React", "TypeScript"],
        location: "Remote",
        education: ["Bachelor's Degree"],
      }),
    }));
    expect(JSON.stringify(persistedData.resumeAnalysis)).not.toContain("resume bytes");
    expect(mocks.runAgent).toHaveBeenCalledWith(expect.any(Function), "resume.pdf", expect.any(Object), "Sam Candidate");
    const loadAuthorizedResume = mocks.runAgent.mock.calls[0][0] as () => Promise<Buffer>;
    expect(await loadAuthorizedResume()).toEqual(Buffer.from("resume bytes"));
  });

  it("fails closed when the resume name does not match the candidate account", async () => {
    const { ResumeIdentityMismatchError } = await import("../../../src/services/ai/agentOrchestrator.js");
    mocks.runAgent.mockRejectedValue(new ResumeIdentityMismatchError());
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    await processProfileRecommendation(7);

    expect(mocks.prisma.hiringProfile.updateMany.mock.calls[1][0].data.recommendationStatus).toBe("FAILED");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(JSON.stringify(errorLog.mock.calls)).toContain("RESUME_IDENTITY_MISMATCH");
  });

  it("does not compare a vendor uploader's name with the candidate printed on the resume", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ role: "IT_VENDOR", firstName: "Vendor", lastName: "Account" });

    await processProfileRecommendation(7);

    expect(mocks.runAgent).toHaveBeenCalledWith(expect.any(Function), "resume.pdf", expect.any(Object), undefined);
    const loadAuthorizedResume = mocks.runAgent.mock.calls[0][0] as () => Promise<Buffer>;
    expect(await loadAuthorizedResume()).toEqual(Buffer.from("resume bytes"));
    expect(mocks.tx.hiringProfile.updateMany.mock.calls[0][0].data).toEqual(expect.objectContaining({
      recommendationStatus: "COMPLETED",
      recommendationScore: 0.82,
      resumeAnalysis: expect.objectContaining({ candidateName: "Sam Candidate" }),
    }));
  });

  it("does not process or persist results if another worker already claimed the profile", async () => {
    mocks.prisma.hiringProfile.updateMany.mockResolvedValueOnce({ count: 0 });

    await processProfileRecommendation(7);

    expect(mocks.storage.getObjectStream).not.toHaveBeenCalled();
    expect(mocks.runAgent).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("stores safe provider failure diagnostics without exposing provider text", async () => {
    mocks.runAgent.mockRejectedValue(new RecommendationProviderError(
      "AI provider request failed",
      "PROVIDER_MODEL_NOT_FOUND",
      "groq",
      "missing-model",
      404,
    ));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    await processProfileRecommendation(7);

    const failedUpdate = mocks.prisma.hiringProfile.updateMany.mock.calls[1][0].data;
    expect(failedUpdate).toEqual(expect.objectContaining({
      recommendationStatus: "FAILED",
      recommendationReason: "Evaluation encountered a temporary processing issue. Please retry.",
      recommendationMetadata: { failure: expect.objectContaining({
        errorCode: "PROVIDER_MODEL_NOT_FOUND",
        provider: "groq",
        model: "missing-model",
        httpStatus: 404,
      }) },
    }));
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("private provider response");
    expect(JSON.stringify(errorLog.mock.calls)).toContain("PROVIDER_MODEL_NOT_FOUND");
  });
});
