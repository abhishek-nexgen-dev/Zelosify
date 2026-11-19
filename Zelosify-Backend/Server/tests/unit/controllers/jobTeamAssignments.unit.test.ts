import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    opening: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: prismaMock }));

import { createJob, getManagedJob, listJobAssignees, updateJob } from "../../../src/controllers/jobs/jobsController.js";

function responseMock() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

function existingOpening() {
  return { id: "opening-1", tenantId: "tenant-1", hiringManagerId: "manager-1", recruiterId: null, experienceMin: 2, experienceMax: 5 };
}

describe("opening team assignment authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.opening.findFirst.mockResolvedValue(existingOpening());
    prismaMock.opening.update.mockResolvedValue({ ...existingOpening(), recruiterId: "recruiter-1" });
    prismaMock.user.findFirst.mockResolvedValue({ id: "recruiter-1" });
  });

  it("lets ADMIN assign a same-tenant hiring manager and recruiter", async () => {
    const res = responseMock();
    await updateJob({
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { hiringManagerId: "manager-2", recruiterId: "recruiter-1" },
    } as any, res);

    expect(prismaMock.opening.findFirst).toHaveBeenCalledWith({ where: { id: "opening-1", tenantId: "tenant-1" } });
    expect(prismaMock.user.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "manager-2", tenantId: "tenant-1", role: "HIRING_MANAGER" }, select: { id: true },
    });
    expect(prismaMock.user.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: "recruiter-1", tenantId: "tenant-1", role: "RECRUITER" }, select: { id: true },
    });
    expect(prismaMock.opening.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "opening-1" },
      data: { hiringManagerId: "manager-2", recruiterId: "recruiter-1" },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("creates an unassigned opening by default for ADMIN", async () => {
    const res = responseMock();
    prismaMock.opening.create.mockResolvedValue({ id: "opening-new", hiringManagerId: null, recruiterId: null });

    await createJob({
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      body: {
        title: "Platform Engineer",
        description: "A detailed role description that meets the validation requirements and explains responsibilities and qualifications for the opening.",
        experienceMin: 2,
      },
    } as any, res);

    expect(prismaMock.opening.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: "tenant-1", hiringManagerId: null, recruiterId: null }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("prevents IT vendors from creating openings", async () => {
    const res = responseMock();
    await createJob({
      user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-1" },
      body: { title: "Platform Engineer", experienceMin: 2 },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.opening.create).not.toHaveBeenCalled();
  });

  it("assigns hiring-manager-created openings to the creator and leaves recruiter unassigned", async () => {
    const res = responseMock();
    prismaMock.opening.create.mockResolvedValue({ id: "opening-new", hiringManagerId: "manager-1", recruiterId: null });

    await createJob({
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      body: {
        title: "Platform Engineer",
        description: "A detailed role description that meets the validation requirements and explains responsibilities and qualifications for the opening.",
        experienceMin: 2,
      },
    } as any, res);

    expect(prismaMock.opening.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ hiringManagerId: "manager-1", recruiterId: null }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("lets a hiring manager assign a recruiter while keeping the manager assignment on themselves", async () => {
    const res = responseMock();
    prismaMock.user.findFirst.mockResolvedValue({ id: "recruiter-1" });
    prismaMock.opening.create.mockResolvedValue({ id: "opening-new", hiringManagerId: "manager-1", recruiterId: "recruiter-1" });

    await createJob({
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      body: {
        title: "Platform Engineer",
        description: "A detailed role description that meets the validation requirements and explains responsibilities and qualifications for the opening.",
        experienceMin: 2,
        recruiterId: "recruiter-1",
      },
    } as any, res);

    expect(prismaMock.opening.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ hiringManagerId: "manager-1", recruiterId: "recruiter-1" }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("does not let recruiters assign a hiring manager when creating an opening", async () => {
    const res = responseMock();
    await createJob({
      user: { id: "recruiter-1", role: "RECRUITER", tenantId: "tenant-1" },
      body: {
        title: "Platform Engineer",
        description: "A detailed role description that meets the validation requirements and explains responsibilities and qualifications for the opening.",
        experienceMin: 2,
        hiringManagerId: "manager-1",
      },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.opening.create).not.toHaveBeenCalled();
  });

  it("lets a hiring manager change the recruiter on their own opening without changing its manager", async () => {
    const res = responseMock();
    await updateJob({
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { recruiterId: "recruiter-1" },
    } as any, res);

    expect(prismaMock.opening.findFirst).toHaveBeenCalledWith({
      where: { id: "opening-1", tenantId: "tenant-1", hiringManagerId: "manager-1" },
    });
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { id: "recruiter-1", tenantId: "tenant-1", role: "RECRUITER" }, select: { id: true },
    });
    expect(prismaMock.opening.update).toHaveBeenCalledWith(expect.objectContaining({ data: { recruiterId: "recruiter-1" } }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns a conflict when the selected recruiter is already assigned to this opening", async () => {
    prismaMock.opening.findFirst.mockResolvedValue({ ...existingOpening(), recruiterId: "recruiter-1" });
    const res = responseMock();

    await updateJob({
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { recruiterId: "recruiter-1" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "This recruiter is already assigned to this opening.",
    });
    expect(prismaMock.opening.update).not.toHaveBeenCalled();
  });

  it("loads both assigned users with one tenant-scoped lookup", async () => {
    prismaMock.opening.findFirst.mockResolvedValue({
      ...existingOpening(),
      recruiterId: "recruiter-1",
      title: "Platform Engineer",
    });
    prismaMock.user.findMany.mockResolvedValue([
      { id: "manager-1", role: "HIRING_MANAGER", username: "manager", firstName: "Hiring", lastName: "Manager", email: "manager@example.test" },
      { id: "recruiter-1", role: "RECRUITER", username: "recruiter", firstName: "Talent", lastName: "Partner", email: "recruiter@example.test" },
    ]);
    const res = responseMock();

    await getManagedJob({
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "opening-1" },
    } as any, res);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["manager-1", "recruiter-1"] },
        tenantId: "tenant-1",
        role: { in: ["HIRING_MANAGER", "RECRUITER"] },
      },
      select: { id: true, username: true, firstName: true, lastName: true, email: true, role: true },
    });
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        hiringManager: expect.objectContaining({ id: "manager-1" }),
        recruiter: expect.objectContaining({ id: "recruiter-1" }),
      }),
    }));
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData.hiringManager).not.toHaveProperty("role");
    expect(responseData.recruiter).not.toHaveProperty("role");
  });

  it("allows ADMIN to clear an existing hiring-manager assignment", async () => {
    const res = responseMock();
    await updateJob({
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { hiringManagerId: null },
    } as any, res);

    expect(prismaMock.opening.update).toHaveBeenCalledWith({
      where: { id: "opening-1" }, data: { hiringManagerId: null },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns a conflict when ADMIN selects the already assigned hiring manager", async () => {
    const res = responseMock();

    await updateJob({
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { hiringManagerId: "manager-1" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "This hiring manager is already assigned to this opening.",
    });
    expect(prismaMock.opening.update).not.toHaveBeenCalled();
  });

  it("prevents IT vendors from changing opening team assignments", async () => {
    const res = responseMock();
    await updateJob({
      user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { recruiterId: "recruiter-1" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.opening.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.opening.update).not.toHaveBeenCalled();
  });

  it("denies a hiring manager any attempt to change the hiring manager assignment", async () => {
    const res = responseMock();
    await updateJob({
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { hiringManagerId: "manager-2" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.opening.update).not.toHaveBeenCalled();
  });

  it("prevents a hiring manager from assigning a non-recruiter or cross-tenant user", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    const res = responseMock();
    await updateJob({
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { recruiterId: "other-tenant-manager" },
    } as any, res);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { id: "other-tenant-manager", tenantId: "tenant-1", role: "RECRUITER" }, select: { id: true },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.opening.update).not.toHaveBeenCalled();
  });

  it("prevents recruiters from changing existing opening assignments", async () => {
    const res = responseMock();
    await updateJob({
      user: { id: "recruiter-1", role: "RECRUITER", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { recruiterId: null },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.opening.update).not.toHaveBeenCalled();
  });

  it("keeps recruiter opening edits working when no assignment fields are submitted", async () => {
    const res = responseMock();
    await updateJob({
      user: { id: "recruiter-1", role: "RECRUITER", tenantId: "tenant-1" },
      params: { id: "opening-1" },
      body: { title: "Updated platform engineer" },
    } as any, res);

    expect(prismaMock.opening.update).toHaveBeenCalledWith({
      where: { id: "opening-1" }, data: { title: "Updated platform engineer" },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("limits hiring managers' assignment choices to recruiters and themselves", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "manager-1", role: "HIRING_MANAGER" },
      { id: "manager-2", role: "HIRING_MANAGER" },
      { id: "recruiter-1", role: "RECRUITER" },
    ]);
    const res = responseMock();
    await listJobAssignees({ user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" } } as any, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { recruiters: [{ id: "recruiter-1", role: "RECRUITER" }], hiringManagers: [{ id: "manager-1", role: "HIRING_MANAGER" }] },
    });
  });

  it("prevents a recruiter from creating an opening assigned to a different recruiter", async () => {
    const res = responseMock();
    await createJob({
      user: { id: "recruiter-1", role: "RECRUITER", tenantId: "tenant-1" },
      body: {
        title: "Platform Engineer", description: "A detailed role description that meets the API validation requirements for this test.",
        experienceMin: 2, experienceMax: 5, hiringManagerId: "manager-1", recruiterId: "recruiter-2",
      },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.opening.create).not.toHaveBeenCalled();
  });

  it("prevents a hiring manager from creating an opening assigned to another manager", async () => {
    const res = responseMock();
    await createJob({
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      body: {
        title: "Platform Engineer", description: "A detailed role description that meets the API validation requirements for this test.",
        experienceMin: 2, experienceMax: 5, hiringManagerId: "manager-2", recruiterId: "recruiter-1",
      },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.opening.create).not.toHaveBeenCalled();
  });
});
