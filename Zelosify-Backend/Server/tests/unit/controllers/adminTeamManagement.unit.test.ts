import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, getAdminTokenMock, deleteKeycloakUserMock, createKeycloakUserMock, axiosMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    opening: { count: vi.fn(), updateMany: vi.fn(), groupBy: vi.fn() },
    tenants: { upsert: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  getAdminTokenMock: vi.fn(),
  deleteKeycloakUserMock: vi.fn(),
  createKeycloakUserMock: vi.fn(),
  axiosMock: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: prismaMock }));
vi.mock("../../../src/utils/keycloak/getAdminToken.js", () => ({ getAdminToken: getAdminTokenMock }));
vi.mock("../../../src/utils/keycloak/deleteKeycloakUser.js", () => ({ deleteKeycloakUser: deleteKeycloakUserMock }));
vi.mock("../../../src/utils/keycloak/createKeycloakUser.js", () => ({ createKeycloakUser: createKeycloakUserMock }));
vi.mock("axios", () => ({ default: axiosMock }));

import {
  addTeamMemberPermission,
  createTeamMember,
  deleteTeamMember,
  listPermissionTargets,
  listRecruiters,
  removeTeamMemberPermission,
  updateTeamMemberPermissions,
} from "../../../src/controllers/admin/adminController.js";
import {
  addTeamPermissionSchema,
  listRecruitersQuerySchema,
  removeTeamPermissionSchema,
  updateUserPermissionsSchema,
} from "../../../src/validations/authValidation.js";

function responseMock() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

describe("team account management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdminTokenMock.mockResolvedValue("test-admin-token");
    createKeycloakUserMock.mockResolvedValue({ id: "keycloak-user-1" });
    deleteKeycloakUserMock.mockResolvedValue(undefined);
    axiosMock.get.mockImplementation(async (url: string) => ({
      data: { id: "keycloak-role-1", name: String(url).endsWith("/HIRING_MANAGER") ? "HIRING_MANAGER" : String(url).endsWith("/IT_VENDOR") ? "IT_VENDOR" : "RECRUITER" },
    }));
    axiosMock.post.mockResolvedValue({ status: 204 });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.tenants.upsert.mockResolvedValue({ tenantId: "tenant-1" });
    prismaMock.user.create.mockResolvedValue({
      id: "team-member-1", role: "RECRUITER", username: "new_member", email: "new@example.test",
    });
  });

  it.each([
    ["ADMIN", "RECRUITER"],
    ["ADMIN", "HIRING_MANAGER"],
    ["ADMIN", "IT_VENDOR"],
  ])("allows %s to create a %s with its matching Keycloak role and default permissions", async (creatorRole, memberRole) => {
    const res = responseMock();

    await createTeamMember({
      user: { id: "creator-1", username: "creator", role: creatorRole, tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
      body: {
        username: "new_member", email: "new@example.test", password: "Temporary-Password-42",
        firstName: "New", lastName: "Member", role: memberRole, tenantId: "untrusted-tenant",
      },
    } as any, res);

    const [, identityPayload] = createKeycloakUserMock.mock.calls[0];
    expect(identityPayload.credentials).toEqual([
      { type: "password", value: "Temporary-Password-42", temporary: false },
    ]);
    expect(identityPayload).not.toHaveProperty("requiredActions");
    expect(axiosMock.get).toHaveBeenCalledWith(expect.stringContaining(`/roles/${memberRole}`), expect.any(Object));
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringContaining("/users/keycloak-user-1/role-mappings/realm"),
      [{ id: "keycloak-role-1", name: memberRole }],
      expect.any(Object),
    );
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        role: memberRole,
        tenantId: "tenant-1",
        permissions: expect.arrayContaining(memberRole === "RECRUITER" ? ["JOBS_VIEW"] : memberRole === "HIRING_MANAGER" ? ["CANDIDATES_SHORTLIST"] : ["VENDOR_PROFILES_SUBMIT"]),
      }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("prevents hiring managers from creating another hiring manager", async () => {
    const res = responseMock();

    await createTeamMember({
      user: { id: "manager-1", username: "manager", role: "HIRING_MANAGER", tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
      body: { username: "new_manager", email: "new@example.test", role: "HIRING_MANAGER" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(getAdminTokenMock).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("prevents recruiters from creating any team account", async () => {
    const res = responseMock();

    await createTeamMember({
      user: { id: "recruiter-1", username: "recruiter", role: "RECRUITER", tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
      body: { username: "new_member", email: "new@example.test", role: "RECRUITER" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(getAdminTokenMock).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("prevents vendors and hiring managers from creating any team account", async () => {
    for (const role of ["IT_VENDOR", "HIRING_MANAGER"]) {
      const res = responseMock();
      await createTeamMember({
        user: { id: `${role.toLowerCase()}-1`, username: role.toLowerCase(), role, tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
        body: { username: "new_member", email: "new@example.test", role: "RECRUITER" },
      } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
    }
    expect(getAdminTokenMock).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("requires the persisted create permission even for an otherwise allowed role", async () => {
    const res = responseMock();

    await createTeamMember({
      user: { id: "admin-1", username: "admin", role: "ADMIN", tenantId: "tenant-1", permissions: [] },
      body: { username: "new_member", email: "new@example.test", role: "RECRUITER" },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(getAdminTokenMock).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("removes the Keycloak identity if role mapping fails", async () => {
    axiosMock.post.mockRejectedValueOnce(new Error("role mapping failed"));
    const res = responseMock();

    await createTeamMember({
      user: { id: "admin-1", username: "admin", role: "ADMIN", tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
      body: { username: "new_member", email: "new@example.test", role: "HIRING_MANAGER" },
    } as any, res);

    expect(deleteKeycloakUserMock).toHaveBeenCalledWith("test-admin-token", "keycloak-user-1");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("creates a missing Keycloak realm role before assigning a hiring manager", async () => {
    axiosMock.get.mockRejectedValueOnce({ response: { status: 404 } });
    const res = responseMock();

    await createTeamMember({
      user: { id: "admin-1", username: "admin", role: "ADMIN", tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
      body: {
        username: "new_manager", email: "manager@example.test", password: "Temporary-Password-42",
        firstName: "New", lastName: "Manager", role: "HIRING_MANAGER",
      },
    } as any, res);

    expect(axiosMock.post).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/admin\/realms\/[^/]+\/roles$/),
      { name: "HIRING_MANAGER" },
      expect.any(Object),
    );
    expect(axiosMock.post).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/users/keycloak-user-1/role-mappings/realm"),
      [{ id: "keycloak-role-1", name: "HIRING_MANAGER" }],
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
  });

  it("returns a conflict when the identity provider already has the username or email", async () => {
    createKeycloakUserMock.mockRejectedValueOnce({
      code: "ERR_BAD_REQUEST",
      response: { status: 409 },
    });
    const res = responseMock();

    await createTeamMember({
      user: { id: "admin-1", username: "admin", role: "ADMIN", tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
      body: {
        username: "existing_manager", email: "manager@example.test", password: "Temporary-Password-42",
        firstName: "Existing", lastName: "Manager", role: "HIRING_MANAGER",
      },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "A user with this username or email already exists in the identity provider.",
    });
    expect(deleteKeycloakUserMock).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("removes the Keycloak identity and returns conflict if database uniqueness rejects creation", async () => {
    prismaMock.user.create.mockRejectedValueOnce({ code: "P2002" });
    const res = responseMock();

    await createTeamMember({
      user: { id: "admin-1", username: "admin", role: "ADMIN", tenantId: "tenant-1", permissions: ["RECRUITER_CREATE"] },
      body: { username: "new_member", email: "new@example.test", role: "RECRUITER" },
    } as any, res);

    expect(deleteKeycloakUserMock).toHaveBeenCalledWith("test-admin-token", "keycloak-user-1");
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "User with this username or email already exists.",
    }));
  });

  it("denies hiring managers from deleting team accounts", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const req: any = {
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      params: { id: "manager-2" },
    };
    const res = responseMock();

    await deleteTeamMember(req, res);

    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("restricts full permission replacement to admins", async () => {
    const req: any = {
      user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-1" },
      params: { id: "recruiter-2" },
      body: { permissions: ["JOBS_VIEW"] },
    };
    const res = responseMock();

    await updateTeamMemberPermissions(req, res);

    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows admins to replace permissions for same-tenant IT vendors", async () => {
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "vendor-2" },
      body: { permissions: ["JOBS_VIEW", "JOBS_CREATE"] },
    };
    const res = responseMock();

    await updateTeamMemberPermissions(req, res);

    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "vendor-2", tenantId: "tenant-1", role: { in: ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"] } },
      data: { permissions: ["JOBS_VIEW", "JOBS_CREATE"] },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: "vendor-2", permissions: ["JOBS_VIEW", "JOBS_CREATE"] },
    });
  });

  it("lets admins add a permission to another internal account", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ id: "recruiter-2", permissions: ["JOBS_VIEW", "JOBS_CREATE"] }]);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "recruiter-2" },
      body: { permission: "JOBS_CREATE" },
    };
    const res = responseMock();

    await addTeamMemberPermission(req, res);

    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: "recruiter-2", permissions: ["JOBS_VIEW", "JOBS_CREATE"] },
    });
  });

  it("lets admins revoke a permission from another internal account", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ id: "manager-2", permissions: ["JOBS_VIEW"] }]);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "manager-2", permission: "JOBS_CREATE" },
    };
    const res = responseMock();

    await removeTeamMemberPermission(req, res);

    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: "manager-2", permissions: ["JOBS_VIEW"] },
    });
  });

  it("prevents IT vendors from changing team permissions", async () => {
    const req: any = {
      user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-1" },
      params: { id: "vendor-1", permission: "JOBS_CREATE" },
    };
    const res = responseMock();

    await removeTeamMemberPermission(req, res);

    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("denies hiring managers access to the individual permission APIs", async () => {
    const req: any = {
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      params: { id: "recruiter-2", permission: "JOBS_CREATE" },
      body: { permission: "JOBS_CREATE" },
    };
    const res = responseMock();

    await addTeamMemberPermission(req, res);

    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns not found rather than allowing a candidate permission target", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "candidate-1", permission: "JOBS_VIEW" },
    };
    const res = responseMock();

    await removeTeamMemberPermission(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns not found for a permission target outside the actor's tenant", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "other-tenant-recruiter", permission: "JOBS_CREATE" },
    };
    const res = responseMock();

    await removeTeamMemberPermission(req, res);

    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
    expect(prismaMock.$queryRaw.mock.calls[0]).toContain("tenant-1");
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rejects unknown permissions and duplicate permissions at the request boundary", () => {
    expect(addTeamPermissionSchema.safeParse({
      params: { id: "recruiter-2" },
      body: { permission: "ROOT_ACCESS" },
    }).success).toBe(false);
    expect(removeTeamPermissionSchema.safeParse({
      params: { id: "recruiter-2", permission: "CANDIDATE_DELETE" },
    }).success).toBe(false);
    expect(updateUserPermissionsSchema.safeParse({
      params: { id: "recruiter-2" },
      body: { permissions: ["JOBS_VIEW", "JOBS_VIEW"] },
    }).success).toBe(false);
    expect(updateUserPermissionsSchema.safeParse({
      params: { id: "hm-user-uuid-001" },
      body: { permissions: ["JOBS_VIEW"] },
    }).success).toBe(true);
  });

  it("validates team list search, role, and pagination query parameters", () => {
    expect(listRecruitersQuerySchema.safeParse({
      query: { page: "2", limit: "10", search: "  Alex  ", role: "RECRUITER" },
    })).toMatchObject({
      success: true,
      data: { query: { page: 2, limit: 10, search: "Alex", role: "RECRUITER" } },
    });
    expect(listRecruitersQuerySchema.safeParse({ query: { role: "IT_VENDOR" } }).success).toBe(true);
    expect(listRecruitersQuerySchema.safeParse({
      query: { role: "ADMIN" },
    }).success).toBe(false);
    expect(listRecruitersQuerySchema.safeParse({
      query: { search: "x".repeat(101) },
    }).success).toBe(false);
    expect(listRecruitersQuerySchema.safeParse({
      query: { page: "0", limit: "101" },
    }).success).toBe(false);
  });

  it("lists tenant-scoped internal permission targets for administrators", async () => {
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.user.findMany.mockResolvedValue([]);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      query: { page: 1, limit: 20 },
    };
    const res = responseMock();

    await listPermissionTargets(req, res);

    expect(prismaMock.user.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-1",
        role: { in: ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"] },
      },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }));
  });

  it("lists tenant recruiters and managers with filtered search and assignment counts for admins", async () => {
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.user.findMany.mockResolvedValue([
      { id: "recruiter-1", role: "RECRUITER", username: "alex", permissions: [], email: "alex@example.com" },
      { id: "manager-1", role: "HIRING_MANAGER", username: "lucius", permissions: [], email: "lucius@example.com" },
    ]);
    prismaMock.opening.groupBy
      .mockResolvedValueOnce([{ recruiterId: "recruiter-1", _count: { _all: 3 } }])
      .mockResolvedValueOnce([{ hiringManagerId: "manager-1", _count: { _all: 2 } }]);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      query: { page: 2, limit: 10, search: "alex" },
    };
    const res = responseMock();

    await listRecruiters(req, res);

    expect(prismaMock.user.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: "tenant-1",
        role: { in: ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"] },
        OR: expect.arrayContaining([
          { username: { contains: "alex", mode: "insensitive" } },
          { email: { contains: "alex", mode: "insensitive" } },
        ]),
      }),
    }));
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(prismaMock.opening.groupBy).toHaveBeenNthCalledWith(1, expect.objectContaining({
      by: ["recruiterId"],
      where: { tenantId: "tenant-1", recruiterId: { in: ["recruiter-1"] } },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      pagination: { page: 2, limit: 10, total: 2, totalPages: 1 },
      data: [
        expect.objectContaining({ id: "recruiter-1", assignedJobsCount: 3 }),
        expect.objectContaining({ id: "manager-1", assignedJobsCount: 2 }),
      ],
    }));
  });

  it("denies hiring managers access to the tenant team list", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findMany.mockResolvedValue([
      { id: "recruiter-1", role: "RECRUITER", username: "alex", permissions: [] },
    ]);
    prismaMock.opening.groupBy.mockResolvedValue([{ recruiterId: "recruiter-1", _count: { _all: 1 } }]);
    const req: any = {
      user: { id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" },
      query: { page: 1, limit: 10, role: "HIRING_MANAGER" },
    };
    const res = responseMock();

    await listRecruiters(req, res);

    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("requires reassignment before an admin removes a manager with openings", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "manager-2", role: "HIRING_MANAGER", externalId: "kc-2" });
    prismaMock.opening.count.mockResolvedValue(2);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "manager-2" },
    };
    const res = responseMock();

    await deleteTeamMember(req, res);

    expect(prismaMock.opening.count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", hiringManagerId: "manager-2" },
    });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(deleteKeycloakUserMock).not.toHaveBeenCalled();
  });

  it("prevents an IT vendor from deleting team accounts", async () => {
    const req: any = {
      user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-1" },
      params: { id: "recruiter-2" },
    };
    const res = responseMock();

    await deleteTeamMember(req, res);

    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows an admin to delete a same-tenant hiring manager with no assigned openings", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "manager-2", role: "HIRING_MANAGER", externalId: null });
    prismaMock.opening.count.mockResolvedValue(0);
    const transaction = { user: { delete: vi.fn().mockResolvedValue({ id: "manager-2" }) } };
    prismaMock.$transaction.mockImplementation((callback) => callback(transaction));
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "manager-2" },
    };
    const res = responseMock();

    await deleteTeamMember(req, res);

    expect(transaction.user.delete).toHaveBeenCalledWith({ where: { id: "manager-2" } });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Hiring manager account deleted.",
    }));
  });

  it("removes recruiter assignments and deletes both local and identity accounts", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "recruiter-2", role: "RECRUITER", externalId: "kc-2" });
    const transaction = {
      opening: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { delete: vi.fn().mockResolvedValue({ id: "recruiter-2" }) },
    };
    prismaMock.$transaction.mockImplementation((callback) => callback(transaction));
    getAdminTokenMock.mockResolvedValue("admin-token");
    deleteKeycloakUserMock.mockResolvedValue(undefined);
    const req: any = {
      user: { id: "admin-1", role: "ADMIN", tenantId: "tenant-1" },
      params: { id: "recruiter-2" },
    };
    const res = responseMock();

    await deleteTeamMember(req, res);

    expect(transaction.opening.updateMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", recruiterId: "recruiter-2" },
      data: { recruiterId: null },
    });
    expect(transaction.user.delete).toHaveBeenCalledWith({ where: { id: "recruiter-2" } });
    expect(deleteKeycloakUserMock).toHaveBeenCalledWith("admin-token", "kc-2");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: { id: "recruiter-2", identityCleanupPending: false },
    }));
  });
});
