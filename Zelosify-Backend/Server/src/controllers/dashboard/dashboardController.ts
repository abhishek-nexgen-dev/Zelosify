import type { Request, Response } from "express";
import prisma from "../../config/prisma/prisma.js";
import { getOpeningScope } from "../../utils/RBAC/openingScope.js";
import { hasPermission } from "../../utils/RBAC/permissions.js";

const INTERNAL_ROLES = new Set(["ADMIN", "RECRUITER", "HIRING_MANAGER", "IT_VENDOR"]);

export async function getInternalDashboard(req: Request, res: Response): Promise<void> {
  const user = req.user;
  const role = user?.role;
  const userId = user?.id;
  const tenantId = user?.tenantId || user?.tenant?.tenantId;

  if (!INTERNAL_ROLES.has(role)) {
    res.status(403).json({ success: false, message: "An internal workspace account is required." });
    return;
  }
  if (!userId || !tenantId) {
    res.status(403).json({ success: false, message: "A tenant-scoped account is required." });
    return;
  }

  const openingWhere = role === "IT_VENDOR"
    ? { tenantId, status: "OPEN" as const }
    : getOpeningScope({ id: userId, role, tenantId });

  if (!openingWhere) {
    res.status(403).json({ success: false, message: "A tenant-scoped workspace is required." });
    return;
  }

  const canViewCandidates = hasPermission(user, "CANDIDATES_VIEW");
  const canViewJobs = hasPermission(user, "JOBS_VIEW");
  const canViewVendorProfiles = hasPermission(user, "VENDOR_PROFILES_VIEW");

  try {
    const [openingCount, openings, teamAccountCount, ownSubmissionCount, applicantCount] = await Promise.all([
      canViewJobs ? prisma.opening.count({ where: openingWhere }) : Promise.resolve(0),
      canViewJobs ? prisma.opening.findMany({
        where: openingWhere,
        take: 6,
        orderBy: [{ postedDate: "desc" }, { id: "desc" }],
        include: {
          tenant: { select: { companyName: true } },
          ...(canViewCandidates ? { _count: {
            select: {
              hiringProfiles: { where: { isDeleted: false } },
            },
          } } : {}),
        },
      }) : Promise.resolve([]),
      role === "ADMIN"
        ? prisma.user.count({
            where: { tenantId, role: { in: ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"] } },
          })
        : Promise.resolve(null),
      role === "IT_VENDOR" && canViewVendorProfiles
        ? prisma.hiringProfile.count({
            where: {
              uploadedBy: userId,
              isDeleted: false,
              opening: { tenantId },
            },
          })
        : Promise.resolve(null),
      role !== "IT_VENDOR" && canViewJobs && canViewCandidates
        ? prisma.hiringProfile.count({
            where: {
              isDeleted: false,
              opening: { is: openingWhere },
            },
          })
        : Promise.resolve(null),
    ]);

    const managerIds = [...new Set(openings.map((opening) => opening.hiringManagerId).filter((id): id is string => Boolean(id)))];
    const managers = managerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: managerIds }, tenantId, role: "HIRING_MANAGER" },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const managerNames = new Map(
      managers.map((manager) => [
        manager.id,
        `${manager.firstName || ""} ${manager.lastName || ""}`.trim() || "Hiring team",
      ]),
    );

    const recentOpenings = openings.map((opening) => ({
      id: opening.id,
      title: opening.title,
      location: opening.location,
      contractType: opening.contractType,
      status: opening.status,
      postedDate: opening.postedDate,
      companyName: opening.tenant.companyName,
      hiringManagerName: (opening.hiringManagerId ? managerNames.get(opening.hiringManagerId) : undefined) || "Hiring team",
      ...(role !== "IT_VENDOR" && canViewCandidates && { applicantsCount: opening._count.hiringProfiles }),
    }));

    res.json({
      success: true,
      data: {
        role,
        summary: {
          openingCount,
          applicantCount,
          teamAccountCount,
          ownSubmissionCount,
        },
        recentOpenings,
      },
    });
  } catch (error) {
    console.error("[DashboardController] Failed to load internal dashboard:", error);
    res.status(500).json({ success: false, message: "Failed to load dashboard data." });
  }
}
