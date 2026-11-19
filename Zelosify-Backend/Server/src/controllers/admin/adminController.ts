import { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma/prisma.js";
import { AuthProvider, Role } from "@prisma/client";
import { createKeycloakUser } from "../../utils/keycloak/createKeycloakUser.js";
import { getAdminToken } from "../../utils/keycloak/getAdminToken.js";
import { ENV } from "../../config/env.js";
import { DEFAULT_ROLE_PERMISSIONS, hasPermission } from "../../utils/RBAC/permissions.js";
import { deleteKeycloakUser } from "../../utils/keycloak/deleteKeycloakUser.js";
import axios from "axios";

function getIdentityFailureDetails(error: unknown): { httpStatus?: number; errorCode?: string } {
  if (typeof error !== "object" || error === null) return {};
  const value = error as { code?: unknown; response?: { status?: unknown } };
  return {
    ...(typeof value.response?.status === "number" ? { httpStatus: value.response.status } : {}),
    ...(typeof value.code === "string" ? { errorCode: value.code } : {}),
  };
}

async function ensureRealmRole(
  keycloakBase: string,
  role: Role,
  requestConfig: { headers: { Authorization: string }; timeout: number },
): Promise<{ id: string; name: string }> {
  const roleUrl = `${keycloakBase}/roles/${encodeURIComponent(role)}`;
  let roleResponse;
  try {
    roleResponse = await axios.get(roleUrl, requestConfig);
  } catch (error) {
    if (getIdentityFailureDetails(error).httpStatus !== 404) throw error;

    try {
      await axios.post(`${keycloakBase}/roles`, { name: role }, requestConfig);
    } catch (createError) {
      // Another request may have created the realm role between lookup and create.
      if (getIdentityFailureDetails(createError).httpStatus !== 409) throw createError;
    }
    roleResponse = await axios.get(roleUrl, requestConfig);
  }

  const keycloakRole = roleResponse.data;
  if (keycloakRole?.name !== role || typeof keycloakRole?.id !== "string") {
    throw new Error("The selected identity role is not configured in Keycloak.");
  }
  return keycloakRole;
}




export async function createTeamMember(req: Request, res: Response): Promise<void> {
  const actor = req.user;
  const creatorRole = actor?.role;
  const role = req.body.role === "HIRING_MANAGER"
    ? Role.HIRING_MANAGER
    : req.body.role === "IT_VENDOR"
      ? Role.IT_VENDOR
      : Role.RECRUITER;
  const tenantId = actor?.tenantId;
  if (!actor?.id || !tenantId || creatorRole !== Role.ADMIN) {
    res.status(403).json({ success: false, message: "Only a tenant administrator can create team accounts." });
    return;
  }
  if (!hasPermission(actor, "RECRUITER_CREATE")) {
    res.status(403).json({ success: false, message: "You do not have permission to create team accounts." });
    return;
  }
  if (actor.role === Role.HIRING_MANAGER && role !== Role.RECRUITER) {
    res.status(403).json({ success: false, message: "Hiring managers can create recruiter accounts only." });
    return;
  }

  const { username, email, password, firstName, lastName, department } = req.body;
  try {
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) {
      res.status(409).json({ success: false, message: "User with this username or email already exists." });
      return;
    }
  } catch {
    console.error(JSON.stringify({ level: "error", event: "TEAM_MEMBER_DUPLICATE_CHECK_FAILED" }));
    res.status(500).json({ success: false, message: "Team account availability could not be checked." });
    return;
  }

  let adminToken: string | undefined;
  let externalId: string | undefined;
  let identityStage = "admin_token";
  try {
    const identityAdminToken = await getAdminToken();
    adminToken = identityAdminToken;
    identityStage = "create_user";
    const keycloakUser = await createKeycloakUser(identityAdminToken, {
      username,
      email,
      firstName,
      lastName,
      enabled: true,
      // Local login uses Keycloak's direct password grant, which cannot complete
      // required actions. Store the creator-provided initial password as permanent.
      credentials: [{ type: "password", value: password, temporary: false }],
    });
    if (!keycloakUser?.id) throw new Error("Identity provider returned no user identifier.");
    const identityId = keycloakUser.id;
    externalId = identityId;

    const keycloakBase = `${ENV.KEYCLOAK_URL}/admin/realms/${ENV.KEYCLOAK_REALM}`;
    const keycloakHeaders = { headers: { Authorization: `Bearer ${identityAdminToken}` }, timeout: 5000 };
    identityStage = "lookup_role";
    const keycloakRole = await ensureRealmRole(keycloakBase, role, keycloakHeaders);
    identityStage = "assign_role";
    await axios.post(
      `${keycloakBase}/users/${encodeURIComponent(identityId)}/role-mappings/realm`,
      [keycloakRole],
      keycloakHeaders,
    );
  } catch (error) {
    const { httpStatus, errorCode } = getIdentityFailureDetails(error);
    if (adminToken && externalId) {
      try {
        await deleteKeycloakUser(adminToken, externalId);
      } catch {
        console.error(JSON.stringify({ level: "error", event: "TEAM_MEMBER_IDENTITY_CLEANUP_FAILED", role, stage: identityStage }));
      }
    }
    console.error(JSON.stringify({
      level: "error",
      event: "TEAM_MEMBER_IDENTITY_PROVISIONING_FAILED",
      role,
      stage: identityStage,
      ...(httpStatus ? { httpStatus } : {}),
      ...(errorCode ? { errorCode } : {}),
    }));
    if (identityStage === "create_user" && httpStatus === 409) {
      res.status(409).json({ success: false, message: "A user with this username or email already exists in the identity provider." });
      return;
    }
    const roleLabel = role === Role.RECRUITER ? "recruiter" : role === Role.HIRING_MANAGER ? "hiring manager" : "IT vendor";
    res.status(503).json({ success: false, message: `The ${roleLabel} identity could not be provisioned.` });
    return;
  }

  try {
    await prisma.tenants.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId, companyName: ENV.DEFAULT_TENANT_NAME || "Bruce Wayne Corp" },
    });
    const teamMember = await prisma.user.create({
      data: {
        username,
        email,
        firstName,
        lastName,
        department: department || "Talent Acquisition",
        role,
        permissions: [...DEFAULT_ROLE_PERMISSIONS[role]],
        tenantId,
        externalId,
        provider: AuthProvider.KEYCLOAK,
        creator: actor.username,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        permissions: true,
        tenantId: true,
        createdAt: true,
      },
    });
    res.status(201).json({
      success: true,
      message: `${role === Role.RECRUITER ? "Recruiter" : role === Role.HIRING_MANAGER ? "Hiring manager" : "IT vendor"} account created successfully.`,
      data: teamMember,
    });
  } catch (error: unknown) {
    if (adminToken && externalId) {
      try {
        await deleteKeycloakUser(adminToken, externalId);
      } catch {
        console.error(JSON.stringify({ level: "error", event: "TEAM_MEMBER_IDENTITY_CLEANUP_FAILED", role, stage: "database_persist" }));
      }
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      res.status(409).json({ success: false, message: "User with this username or email already exists." });
      return;
    }
    console.error(JSON.stringify({ level: "error", event: "TEAM_MEMBER_PERSISTENCE_FAILED", role }));
    res.status(500).json({ success: false, message: "Failed to save the new team account." });
  }
}

// Backward-compatible controller export for existing internal imports.
export const assignRecruiter = createTeamMember;




export async function updateTeamMemberPermissions(req: Request, res: Response): Promise<void> {
  const actor = req.user;
  if (!actor || actor.role !== "ADMIN" || !actor.tenantId) {
    res.status(403).json({ success: false, message: "Only a tenant administrator can replace a team member's full permission list." });
    return;
  }

  const memberId = String(req.params.id);
  const tenantId = actor.tenantId;
  const permissions = req.body.permissions as string[];
  try {
    const updated = await prisma.user.updateMany({
      where: {
        id: memberId,
        tenantId,
        role: { in: ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"] },
      },
      data: { permissions },
    });
    if (updated.count !== 1) {
      res.status(404).json({ success: false, message: "The permitted team member was not found in this tenant." });
      return;
    }
    res.json({ success: true, data: { id: memberId, permissions } });
  } catch (error) {
    console.error("[AdminController] Error updating team permissions:", error);
    res.status(500).json({ success: false, message: "Could not update team permissions." });
  }
}

const permissionManageableRoles = ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"] as const;

async function changeSingleTeamPermission(
  req: Request,
  res: Response,
  action: "add" | "remove",
): Promise<void> {
  const actor = req.user as { id?: string; role?: string; tenantId?: string | null } | undefined;
  if (!actor?.id || actor.role !== "ADMIN" || !actor.tenantId) {
    res.status(403).json({ success: false, message: "Only an administrator can change team permissions." });
    return;
  }

  const memberId = String(req.params.id);
  const permission = action === "add" ? req.body?.permission : req.params.permission;
  if (!permission) {
    res.status(400).json({ success: false, message: "A permission is required." });
    return;
  }

  try {
    const rows = action === "add"
      ? await prisma.$queryRaw<Array<{ id: string; permissions: string[] }>>`
          UPDATE "User"
          SET "permissions" = CASE
            WHEN ${permission} = ANY(COALESCE("permissions", ARRAY[]::TEXT[])) THEN COALESCE("permissions", ARRAY[]::TEXT[])
            ELSE array_append(COALESCE("permissions", ARRAY[]::TEXT[]), ${permission})
          END
          WHERE "id" = ${memberId}
            AND "tenantId" = ${actor.tenantId}
            AND "role"::text IN ('RECRUITER', 'HIRING_MANAGER', 'IT_VENDOR')
          RETURNING "id", "permissions"
        `
      : await prisma.$queryRaw<Array<{ id: string; permissions: string[] }>>`
          UPDATE "User"
          SET "permissions" = array_remove(COALESCE("permissions", ARRAY[]::TEXT[]), ${permission})
          WHERE "id" = ${memberId}
            AND "tenantId" = ${actor.tenantId}
            AND "role"::text IN ('RECRUITER', 'HIRING_MANAGER', 'IT_VENDOR')
          RETURNING "id", "permissions"
        `;

    if (rows.length !== 1) {
      res.status(404).json({ success: false, message: "The permitted team member was not found in this tenant." });
      return;
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(`[AdminController] Error ${action === "add" ? "adding" : "removing"} team permission:`, error);
    res.status(500).json({ success: false, message: "Could not update the team member's permissions." });
  }
}

export async function addTeamMemberPermission(req: Request, res: Response): Promise<void> {
  await changeSingleTeamPermission(req, res, "add");
}

export async function removeTeamMemberPermission(req: Request, res: Response): Promise<void> {
  await changeSingleTeamPermission(req, res, "remove");
}

export async function listPermissionTargets(req: Request, res: Response): Promise<void> {
  const actor = req.user;
  if (!actor || actor.role !== "ADMIN" || !actor.tenantId) {
    res.status(403).json({ success: false, message: "Only an administrator can view permission targets." });
    return;
  }

  const { page = 1, limit = 20, search, role } = req.query as {
    page?: number;
    limit?: number;
    search?: string;
    role?: (typeof permissionManageableRoles)[number];
  };
  const where = {
    tenantId: actor.tenantId,
    role: { in: role ? [role] : [...permissionManageableRoles] },
    ...(search ? {
      OR: [
        { username: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };
  try {
    const [total, targets] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ role: "asc" }, { createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          permissions: true,
          createdAt: true,
        },
      }),
    ]);
    res.json({
      success: true,
      data: targets,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[AdminController] Error listing permission targets:", error);
    res.status(500).json({ success: false, message: "Could not load permission targets." });
  }
}

export async function deleteTeamMember(req: Request, res: Response): Promise<void> {
  const actor = req.user;
  if (!actor || actor.role !== "ADMIN" || !actor.tenantId) {
    res.status(403).json({ success: false, message: "A tenant administrator account is required." });
    return;
  }

  const memberId = String(req.params.id);
  const tenantId = actor.tenantId;
  if (memberId === actor.id) {
    res.status(400).json({ success: false, message: "You cannot delete your own account from this page." });
    return;
  }

  const allowedTargetRoles = ["RECRUITER" as const, "HIRING_MANAGER" as const];

  try {
    const target = await prisma.user.findFirst({
      where: { id: memberId, tenantId, role: { in: allowedTargetRoles } },
      select: { id: true, role: true, externalId: true },
    });
    if (!target) {
      res.status(404).json({ success: false, message: "The permitted team member was not found in this tenant." });
      return;
    }

    if (target.role === "HIRING_MANAGER") {
      const assignedOpeningCount = await prisma.opening.count({
        where: { tenantId, hiringManagerId: target.id },
      });
      if (assignedOpeningCount > 0) {
        res.status(409).json({
          success: false,
          message: "Reassign this hiring manager's openings before deleting the account.",
        });
        return;
      }
    }

    await prisma.$transaction(async (transaction) => {
      if (target.role === "RECRUITER") {
        await transaction.opening.updateMany({
          where: { tenantId, recruiterId: target.id },
          data: { recruiterId: null },
        });
      }
      await transaction.user.delete({ where: { id: target.id } });
    });

    let identityCleanupPending = false;
    if (target.externalId) {
      try {
        const adminToken = await getAdminToken();
        await deleteKeycloakUser(adminToken, target.externalId);
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          res.json({
            success: true,
            message: `${target.role === "RECRUITER" ? "Recruiter" : "Hiring manager"} account deleted.`,
            data: { id: target.id, identityCleanupPending: false },
          });
          return;
        }
        identityCleanupPending = true;
        const httpStatus = axios.isAxiosError(error) ? error.response?.status : undefined;
        const errorCode = axios.isAxiosError(error) ? error.code : undefined;
        console.error(JSON.stringify({
          level: "error",
          event: "TEAM_IDENTITY_CLEANUP_FAILED",
          ...(httpStatus ? { httpStatus } : {}),
          ...(errorCode ? { errorCode } : {}),
        }));
      }
    }

    res.json({
      success: true,
      message: `${target.role === "RECRUITER" ? "Recruiter" : "Hiring manager"} account deleted.`,
      data: { id: target.id, identityCleanupPending },
    });
  } catch (error) {
    console.error("[AdminController] Error deleting team member:", error);
    res.status(500).json({ success: false, message: "Could not delete the team account." });
  }
}

export async function listRecruiters(req: Request, res: Response): Promise<void> {
  try {
    const adminUser = req.user;
    if (adminUser?.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Only a tenant administrator can view team accounts." });
      return;
    }
    const tenantId = adminUser?.tenantId;
    if (!tenantId) {
      res.status(403).json({ success: false, message: "A tenant-scoped account is required." });
      return;
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const requestedRole = req.query.role === "HIRING_MANAGER"
      ? "HIRING_MANAGER"
      : req.query.role === "IT_VENDOR"
        ? "IT_VENDOR"
        : req.query.role === "RECRUITER"
          ? "RECRUITER"
          : undefined;
    const allowedRoles: Role[] = requestedRole
      ? [requestedRole]
      : ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"];

    const where: Prisma.UserWhereInput = {
      tenantId,
      role: { in: allowedRoles },
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { department: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [total, recruiters] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          permissions: true,
          department: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    ]);

    const recruiterIds = recruiters.filter((person) => person.role === "RECRUITER").map((person) => person.id);
    const hiringManagerIds = recruiters.filter((person) => person.role === "HIRING_MANAGER").map((person) => person.id);
    const [recruiterJobCounts, managerJobCounts] = await Promise.all([
      recruiterIds.length
        ? prisma.opening.groupBy({
            by: ["recruiterId"],
            where: { tenantId, recruiterId: { in: recruiterIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      hiringManagerIds.length
        ? prisma.opening.groupBy({
            by: ["hiringManagerId"],
            where: { tenantId, hiringManagerId: { in: hiringManagerIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);
    const assignedJobsByUserId = new Map<string, number>();
    for (const assignment of recruiterJobCounts) {
      if (assignment.recruiterId) assignedJobsByUserId.set(assignment.recruiterId, assignment._count._all);
    }
    for (const assignment of managerJobCounts) {
      if (assignment.hiringManagerId) assignedJobsByUserId.set(assignment.hiringManagerId, assignment._count._all);
    }

    res.json({
      success: true,
      count: total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: recruiters.map((person) => ({
        ...person,
        assignedJobsCount: assignedJobsByUserId.get(person.id) ?? 0,
      })),
    });
  } catch (error: any) {
    console.error("[AdminController] Error listing recruiters:", error);
    res.status(500).json({ success: false, message: "Failed to list recruiters" });
  }
}
