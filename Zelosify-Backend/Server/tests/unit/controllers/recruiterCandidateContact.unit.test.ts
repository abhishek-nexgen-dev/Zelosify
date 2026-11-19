import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    opening: { findFirst: vi.fn() },
    hiringProfile: { count: vi.fn(), findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
  storage: { getObjectURL: vi.fn() },
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({ createStorageService: () => mocks.storage }));

import { getCandidatesForJob } from "../../../src/controllers/recruiter/recruiterController.js";

describe("GET /jobs/:id/candidates candidate contact fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.opening.findFirst.mockResolvedValue({
      id: "opening-17", tenantId: "tenant-9", title: "Engineer", status: "OPEN", experienceMin: 3, experienceMax: 6, location: "Remote",
    });
    mocks.prisma.hiringProfile.count.mockResolvedValue(1);
    mocks.prisma.hiringProfile.findMany.mockResolvedValue([{
      id: 55,
      openingId: "opening-17",
      uploadedBy: "candidate-42",
      s3Key: "candidate-resumes/tenant-9/candidate-42/resume.pdf",
      submittedAt: new Date("2026-11-17T08:00:00.000Z"),
      status: "SUBMITTED",
      recommendationStatus: "COMPLETED",
      recommended: true,
      recommendationScore: 0.82,
      recommendationConfidence: 0.81,
      recommendationReason: "Relevant experience and skills match.",
      recommendationLatencyMs: 700,
      recommendationVersion: "test-v1",
      atsScore: 82,
      atsBreakdown: null,
      resumeAnalysis: null,
      shortlistedAt: null,
      rejectedAt: null,
    }]);
    mocks.prisma.user.findMany.mockResolvedValue([{
      id: "candidate-42", username: "sam", email: "sam@example.com", firstName: "Sam", lastName: "Candidate", phoneNumber: "+1-555-0100", role: "CANDIDATE",
    }]);
    mocks.storage.getObjectURL.mockResolvedValue("https://storage.example/resume");
  });

  it("returns the candidate mobile number from the User phoneNumber field", async () => {
    const response: any = { json: vi.fn() };
    await getCandidatesForJob({
      params: { id: "opening-17" },
      query: { page: "1", limit: "20" },
      user: { id: "recruiter-1", tenantId: "tenant-9", role: "RECRUITER" },
    } as any, response);

    expect(mocks.prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["candidate-42"] }, tenantId: "tenant-9" },
      select: expect.objectContaining({ phoneNumber: true }),
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      candidates: [expect.objectContaining({
        candidate: expect.objectContaining({
          id: "candidate-42",
          name: "Sam Candidate",
          email: "sam@example.com",
          mobileNumber: "+1-555-0100",
        }),
      })],
    }));
  });

  it("does not present the submitting vendor as the candidate on vendor profiles", async () => {
    mocks.prisma.hiringProfile.findMany.mockResolvedValueOnce([{
      id: 55,
      openingId: "opening-17",
      uploadedBy: "vendor-6",
      s3Key: "tenant-9/opening-17/vendor-6/resume.pdf",
      submittedAt: new Date("2026-11-17T08:00:00.000Z"),
      status: "SUBMITTED",
      recommendationStatus: "COMPLETED",
      recommended: true,
      recommendationScore: 0.82,
      recommendationConfidence: 0.81,
      recommendationReason: "Relevant experience and skills match.",
      recommendationLatencyMs: 700,
      recommendationVersion: "test-v1",
      atsScore: 82,
      atsBreakdown: null,
      resumeAnalysis: { candidateName: "Taylor Candidate" },
      shortlistedAt: null,
      rejectedAt: null,
    }]);
    mocks.prisma.user.findMany.mockResolvedValueOnce([{
      id: "vendor-6", username: "vendor", email: "vendor@example.com", firstName: "Vendor", lastName: "User", phoneNumber: "+1-555-0111", role: "IT_VENDOR",
    }]);
    const response: any = { json: vi.fn() };

    await getCandidatesForJob({
      params: { id: "opening-17" },
      query: { page: "1", limit: "20" },
      user: { id: "manager-1", tenantId: "tenant-9", role: "HIRING_MANAGER" },
    } as any, response);

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      candidates: [expect.objectContaining({
        candidate: { id: null, name: "Taylor Candidate", email: null, mobileNumber: null },
      })],
    }));
  });

  it("filters candidates by status before paginating the result", async () => {
    const response: any = { json: vi.fn() };
    await getCandidatesForJob({
      params: { id: "opening-17" },
      query: { page: "2", limit: "5", status: "REJECTED" },
      user: { id: "recruiter-1", tenantId: "tenant-9", role: "RECRUITER" },
    } as any, response);

    const expectedWhere = { openingId: "opening-17", isDeleted: false, status: "REJECTED" };
    expect(mocks.prisma.hiringProfile.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(mocks.prisma.hiringProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expectedWhere,
      skip: 5,
      take: 5,
    }));
  });
});
