import { getOpeningScope } from "../../utils/RBAC/openingScope.js";
import { decideProfile } from "../../services/hiring/profileDecisionService.js";
import type { Request, Response } from "express";
import prisma from "../../config/prisma/prisma.js";
import { ENV } from "../../config/env.js";
import { hasPermission } from "../../utils/RBAC/permissions.js";

function parsePositiveInteger(value: unknown, fallback: number, maximum: number): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value);
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return Math.min(parsed, maximum);
}

function logHiringControllerError(event: string, error: unknown): void {
  const candidateCode = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
  console.error(JSON.stringify({
    level: "error",
    event,
    ...(candidateCode && /^[A-Z][A-Z0-9_]{1,30}$/.test(candidateCode) ? { errorCode: candidateCode } : {}),
  }));
}







export async function getHiringManagerOpenings(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    const managerId = req.user?.id;

    if (!tenantId || !managerId) {
      return res.status(403).json({ message: "Authentication and tenant context required" });
    }

    const defaultPageLimit = ENV.DEFAULT_PAGE_LIMIT;
    const maxPageLimit = ENV.MAX_PAGE_LIMIT;
    const page = parsePositiveInteger(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = parsePositiveInteger(req.query.limit, defaultPageLimit, maxPageLimit);
    if (page === null || limit === null) {
      return res.status(400).json({ success: false, message: "page and limit must be positive whole numbers." });
    }
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({ success: false, message: "page is outside the supported range." });
    }


    const where = {
      tenantId,
      hiringManagerId: managerId,
    };

    const [total, openings] = await Promise.all([
      prisma.opening.count({ where }),
      prisma.opening.findMany({
        where,
        skip,
        take: limit,
        orderBy: { postedDate: "desc" },
        include: {
          tenant: { select: { companyName: true } },
          _count: {
            select: {
              hiringProfiles: {
                where: { isDeleted: false },
              },
            },
          },
        },
      }),
    ]);

    const canViewCandidates = hasPermission(req.user, "CANDIDATES_VIEW");
    const formatted = openings.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      location: o.location,
      contractType: o.contractType,
      experienceMin: o.experienceMin,
      experienceMax: o.experienceMax,
      postedDate: o.postedDate,
      expectedCompletionDate: o.expectedCompletionDate,
      actionDate: o.actionDate,
      status: o.status,
      companyName:
        o.tenant?.companyName ||
        ENV.DEFAULT_TENANT_NAME ||
        "Bruce Wayne Corp",
      ...(canViewCandidates ? { candidateCount: o._count.hiringProfiles } : {}),
    }));

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logHiringControllerError("HIRING_MANAGER_OPENINGS_LIST_FAILED", error);
    return res.status(500).json({ success: false, message: "Failed to fetch openings." });
  }
}


export async function getHiringManagerOpeningProfiles(req: Request, res: Response) {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant?.tenantId;
    const managerId = req.user?.id;
    const openingId = String(req.params.id);

    if (!tenantId || !managerId) {
      return res.status(403).json({ message: "Authentication and tenant context required" });
    }


    const opening = await prisma.opening.findFirst({
      where: {
        id: openingId,
        tenantId,
        hiringManagerId: managerId,
      },
    });

    if (!opening) {
      return res.status(403).json({
        message: "Access Denied: You do not manage this opening or opening does not exist in your tenant",
      });
    }

    const page = parsePositiveInteger(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = parsePositiveInteger(req.query.limit, 20, 100);
    if (page === null || limit === null) {
      return res.status(400).json({ success: false, message: "page must be a positive integer; limit must be 1..100." });
    }
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({ success: false, message: "page is outside the supported range." });
    }
    const total = await prisma.hiringProfile.count({ where: { openingId, isDeleted: false } });
    const profiles = await prisma.hiringProfile.findMany({
      skip,
      take: limit,
      where: {
        openingId,
        isDeleted: false,
      },
      orderBy: [
        { recommendationScore: "desc" },
        { submittedAt: "desc" },
        { id: "desc" },
      ],
    });

    const formattedProfiles = profiles.map((p) => {
      const fileName = p.s3Key.split("/").pop() || `Profile #${p.id}`;


      const recommendationLabel = p.recommendationStatus === "FAILED" ? "Failed"
        : p.recommendationStatus !== "COMPLETED" || p.recommendationScore === null ? "Processing"
        : p.recommendationScore >= 0.75 ? "Recommended" : p.recommendationScore >= 0.5 ? "Borderline" : "Not Recommended";

      return {
        id: p.id,
        openingId: p.openingId,
        fileName,
        s3Key: p.s3Key,
        uploadedBy: p.uploadedBy,
        uploadDate: p.submittedAt,
        submittedAt: p.submittedAt,
        status: p.status,
        recommendationLabel,
        recommendationStatus: p.recommendationStatus,
        recommended: p.recommended,
        score: p.recommendationScore,
        recommendationScore: p.recommendationScore,
        confidence: p.recommendationConfidence,
        recommendationConfidence: p.recommendationConfidence,
        atsScore: p.atsScore,
        atsBreakdown: p.atsBreakdown,
        resumeAnalysis: p.resumeAnalysis,
        explanation: p.recommendationReason,
        recommendationReason: p.recommendationReason,
        processingTime: p.recommendationLatencyMs,
        recommendationLatencyMs: p.recommendationLatencyMs,
        shortlistedAt: p.shortlistedAt,
        rejectedAt: p.rejectedAt,
      };
    });

    return res.json({
      success: true,
      data: formattedProfiles,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      opening: {
        id: opening.id,
        title: opening.title,
        location: opening.location,
        contractType: opening.contractType,
        experienceMin: opening.experienceMin,
        experienceMax: opening.experienceMax,
        status: opening.status,
      },
    });
  } catch (error) {
    logHiringControllerError("HIRING_MANAGER_OPENING_PROFILES_FAILED", error);
    return res.status(500).json({ success: false, message: "Failed to fetch candidate profiles." });
  }
}


export async function shortlistCandidateProfile(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const actorId = req.user?.id;
  const scope = getOpeningScope(req.user);
  if (!actorId || !scope) {
    res.status(403).json({ success: false, message: "A tenant-scoped hiring account is required." });
    return;
  }
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ success: false, message: "Valid application ID required." });
    return;
  }
  try {
    const result = await decideProfile(id, actorId, scope, "SHORTLISTED");
    if (result.status !== 200 || !result.profile) {
      res.status(result.status).json({ success: false, message: result.status === 404 ? "Application not found." : "Application was already decided or changed. Refresh and try again." });
      return;
    }
    const profile = result.profile;
    res.json({ success: true, message: "Candidate decision saved.", data: { id: profile.id, status: profile.status, shortlistedAt: profile.shortlistedAt, rejectedAt: profile.rejectedAt } });
  } catch {
    res.status(500).json({ success: false, message: "Failed to save candidate decision." });
  }
}

export async function rejectCandidateProfile(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const actorId = req.user?.id;
  const scope = getOpeningScope(req.user);
  if (!actorId || !scope) {
    res.status(403).json({ success: false, message: "A tenant-scoped hiring account is required." });
    return;
  }
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ success: false, message: "Valid application ID required." });
    return;
  }
  try {
    const result = await decideProfile(id, actorId, scope, "REJECTED");
    if (result.status !== 200 || !result.profile) {
      res.status(result.status).json({ success: false, message: result.status === 404 ? "Application not found." : "Application was already decided or changed. Refresh and try again." });
      return;
    }
    const profile = result.profile;
    res.json({ success: true, message: "Candidate decision saved.", data: { id: profile.id, status: profile.status, shortlistedAt: profile.shortlistedAt, rejectedAt: profile.rejectedAt } });
  } catch {
    res.status(500).json({ success: false, message: "Failed to save candidate decision." });
  }
}
