import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    opening: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    hiringProfile: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: prismaMock }));

import {
  getHiringManagerOpeningProfiles,
  getHiringManagerOpenings,
} from "../../../src/controllers/hiring/contractHiringManagerController.js";

function responseMock() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

const managerRequest = {
  user: {
    id: "manager-1",
    role: "HIRING_MANAGER",
    tenantId: "tenant-1",
    permissions: ["JOBS_VIEW", "CANDIDATES_VIEW"],
  },
};

describe("hiring manager opening and profile scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.opening.count.mockResolvedValue(1);
    prismaMock.opening.findMany.mockResolvedValue([{
      id: "opening-1",
      title: "Platform Engineer",
      tenant: { companyName: "Example Org" },
      _count: { hiringProfiles: 2 },
    }]);
    prismaMock.opening.findFirst.mockResolvedValue({
      id: "opening-1",
      tenantId: "tenant-1",
      hiringManagerId: "manager-1",
      title: "Platform Engineer",
    });
    prismaMock.hiringProfile.count.mockResolvedValue(1);
    prismaMock.hiringProfile.findMany.mockResolvedValue([{
      id: 7,
      openingId: "opening-1",
      s3Key: "tenant-1/opening-1/vendor-1/resume.pdf",
      uploadedBy: "vendor-1",
      submittedAt: new Date("2026-11-18T00:00:00.000Z"),
      status: "SUBMITTED",
      recommendationStatus: "COMPLETED",
      recommendationScore: 0.82,
      recommendationConfidence: 0.8,
      recommendationReason: "Strong skill match.",
      recommendationLatencyMs: 900,
      atsScore: 82,
      atsBreakdown: {},
      resumeAnalysis: {},
      shortlistedAt: null,
      rejectedAt: null,
    }]);
  });

  it("lists only openings assigned to the authenticated manager in their tenant", async () => {
    const res = responseMock();
    await getHiringManagerOpenings({ ...managerRequest, query: {} } as any, res);

    expect(prismaMock.opening.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: "tenant-1", hiringManagerId: "manager-1" },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ id: "opening-1", candidateCount: 2 })],
    }));
  });

  it.each(["1.5", "2abc", "0", "9007199254740992"])("rejects malformed manager list page %s", async (page) => {
    const res = responseMock();
    await getHiringManagerOpenings({ ...managerRequest, query: { page } } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.opening.count).not.toHaveBeenCalled();
    expect(prismaMock.opening.findMany).not.toHaveBeenCalled();
  });

  it("does not expose database error details in manager API responses", async () => {
    prismaMock.opening.count.mockRejectedValueOnce(new Error("private database diagnostic"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = responseMock();

    await getHiringManagerOpenings({ ...managerRequest, query: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("private database diagnostic");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("HIRING_MANAGER_OPENINGS_LIST_FAILED"));
    log.mockRestore();
  });

  it("does not query another manager's opening profiles", async () => {
    prismaMock.opening.findFirst.mockResolvedValueOnce(null);
    const res = responseMock();
    await getHiringManagerOpeningProfiles({
      ...managerRequest,
      params: { id: "other-manager-opening" },
      query: {},
    } as any, res);

    expect(prismaMock.opening.findFirst).toHaveBeenCalledWith({
      where: { id: "other-manager-opening", tenantId: "tenant-1", hiringManagerId: "manager-1" },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.hiringProfile.findMany).not.toHaveBeenCalled();
  });

  it("returns validated profiles only after checking manager and tenant ownership", async () => {
    const res = responseMock();
    await getHiringManagerOpeningProfiles({
      ...managerRequest,
      params: { id: "opening-1" },
      query: { page: "2", limit: "10" },
    } as any, res);

    expect(prismaMock.hiringProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10,
      take: 10,
      where: { openingId: "opening-1", isDeleted: false },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ recommendationLabel: "Recommended", score: 0.82 })],
    }));
  });

  it("rejects malformed profile pagination before profile queries", async () => {
    const res = responseMock();
    await getHiringManagerOpeningProfiles({
      ...managerRequest,
      params: { id: "opening-1" },
      query: { page: "2abc", limit: "20" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.hiringProfile.count).not.toHaveBeenCalled();
    expect(prismaMock.hiringProfile.findMany).not.toHaveBeenCalled();
  });
});
