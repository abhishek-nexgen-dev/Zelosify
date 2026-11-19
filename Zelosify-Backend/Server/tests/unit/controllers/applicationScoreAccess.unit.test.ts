import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { hiringProfile: { findFirst: vi.fn() }, user: { findUnique: vi.fn() } },
  storage: { getObjectURL: vi.fn() },
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({ createStorageService: () => mocks.storage }));

import { getMyApplicationScore } from "../../../src/controllers/candidate/candidateController.js";
import { getCandidateApplicationScore } from "../../../src/controllers/recruiter/recruiterController.js";

function makeResponse() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

function makeProfile() {
  return {
    id: 17,
    status: "SUBMITTED",
    submittedAt: new Date("2026-11-17T08:00:00.000Z"),
    recommendationStatus: "COMPLETED",
    recommended: true,
    recommendationScore: 0.82,
    recommendationConfidence: 0.81,
    recommendationReason: "**Strong match.** Relevant experience and skills.",
    recommendationLatencyMs: 900,
    recommendationVersion: "v1.2.0",
    atsScore: 82,
    uploadedBy: "candidate-1",
    opening: {
      id: "opening-5",
      title: "Platform Engineer",
      location: "Remote",
      tenant: { companyName: "Example Org" },
    },
  };
}

describe("dedicated application score access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue(makeProfile());
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "candidate-1", username: "sam", firstName: "Sam", lastName: "Candidate", email: "sam@example.com" });
  });

  it("returns an application score to its owning candidate only", async () => {
    const response = makeResponse();

    await getMyApplicationScore({
      user: { id: "candidate-1", role: "CANDIDATE" },
      params: { id: "17" },
    } as any, response);

    expect(mocks.prisma.hiringProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 17, uploadedBy: "candidate-1", isDeleted: false },
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        applicationId: 17,
        aiScreening: expect.objectContaining({ score: 82, confidence: 81, band: "Recommended" }),
      }),
    }));
  });

  it("requires a tenant-scoped internal role and checks assigned-manager scope", async () => {
    const response = makeResponse();

    await getCandidateApplicationScore({
      user: { id: "manager-1", tenantId: "tenant-1", role: "HIRING_MANAGER" },
      params: { id: "17" },
    } as any, response);

    expect(mocks.prisma.hiringProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: 17,
        isDeleted: false,
        opening: { is: { tenantId: "tenant-1", hiringManagerId: "manager-1" } },
      },
    }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ candidate: { id: "candidate-1", name: "Sam Candidate", email: "sam@example.com" } }),
    }));
  });

  it("does not reveal an internal score outside the caller's tenant or opening scope", async () => {
    mocks.prisma.hiringProfile.findFirst.mockResolvedValueOnce(null);
    const response = makeResponse();

    await getCandidateApplicationScore({
      user: { id: "recruiter-1", tenantId: "tenant-2", role: "RECRUITER" },
      params: { id: "17" },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ success: false, message: "Application not found." });
  });

  it("rejects candidate access without authentication before querying profiles", async () => {
    const response = makeResponse();

    await getMyApplicationScore({ params: { id: "17" } } as any, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(mocks.prisma.hiringProfile.findFirst).not.toHaveBeenCalled();
  });
});
