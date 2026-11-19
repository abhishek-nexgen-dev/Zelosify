import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    opening: { count: vi.fn(), findMany: vi.fn() },
    hiringProfile: { count: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: prismaMock }));

import { getInternalDashboard } from "../../../src/controllers/dashboard/dashboardController.js";

function responseMock() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

describe("internal dashboard applicant totals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.opening.count.mockResolvedValue(7);
    prismaMock.opening.findMany.mockResolvedValue([
      {
        id: "recent-opening-1",
        title: "Frontend Developer",
        location: "Remote",
        contractType: "Full-Time",
        status: "OPEN",
        postedDate: new Date("2026-11-17T00:00:00.000Z"),
        tenant: { companyName: "Example Org" },
        hiringManagerId: "manager-1",
        _count: { hiringProfiles: 0 },
      },
    ]);
    prismaMock.hiringProfile.count.mockResolvedValue(1);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.user.findMany.mockResolvedValue([
      { id: "manager-1", firstName: "Hiring", lastName: "Manager" },
    ]);
  });

  it("counts active applicants across all in-scope openings, not only the six recent rows", async () => {
    const res = responseMock();
    await getInternalDashboard({
      user: {
        id: "admin-1",
        role: "ADMIN",
        tenantId: "tenant-1",
        permissions: ["JOBS_VIEW", "CANDIDATES_VIEW"],
      },
    } as any, res);

    expect(prismaMock.hiringProfile.count).toHaveBeenCalledWith({
      where: {
        isDeleted: false,
        opening: { is: { tenantId: "tenant-1" } },
      },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        summary: expect.objectContaining({ openingCount: 7, applicantCount: 1 }),
        recentOpenings: [expect.objectContaining({ applicantsCount: 0 })],
      }),
    }));
  });

  it("keeps applicant totals scoped to the hiring manager's own openings", async () => {
    const res = responseMock();
    await getInternalDashboard({
      user: {
        id: "manager-1",
        role: "HIRING_MANAGER",
        tenantId: "tenant-1",
        permissions: ["JOBS_VIEW", "CANDIDATES_VIEW"],
      },
    } as any, res);

    expect(prismaMock.hiringProfile.count).toHaveBeenCalledWith({
      where: {
        isDeleted: false,
        opening: { is: { tenantId: "tenant-1", hiringManagerId: "manager-1" } },
      },
    });
  });

  it("does not query or expose applicant totals without candidate-view permission", async () => {
    const res = responseMock();
    await getInternalDashboard({
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1", permissions: ["JOBS_VIEW"] },
    } as any, res);

    expect(prismaMock.hiringProfile.count).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ summary: expect.objectContaining({ applicantCount: null }) }),
    }));
  });
});
