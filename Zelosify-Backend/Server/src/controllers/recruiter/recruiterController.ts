import { decideProfile } from "../../services/hiring/profileDecisionService.js";
import { Request, Response } from "express";
import prisma from "../../config/prisma/prisma.js";
import { createStorageService } from "../../services/storage/storageFactory.js";
import { getOpeningScope } from "../../utils/RBAC/openingScope.js";
import { formatPublicAnalysisIssue, formatPublicRecommendation } from "../../utils/ai/publicRecommendation.js";

/** Return a candidate score only when the caller can access its opening. */
export async function getCandidateApplicationScore(req: Request, res: Response): Promise<void> {
  const applicationId = Number(req.params.id);
  const scope = getOpeningScope(req.user);
  if (!scope) {
    res.status(403).json({ success: false, message: "A tenant-scoped recruiting account is required." });
    return;
  }
  if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
    res.status(400).json({ success: false, message: "Valid application ID required." });
    return;
  }

  try {
    const application = await prisma.hiringProfile.findFirst({
      where: { id: applicationId, isDeleted: false, opening: { is: scope } },
      include: {
        opening: {
          select: {
            id: true,
            title: true,
            location: true,
            tenant: { select: { companyName: true } },
          },
        },
      },
    });
    if (!application) {
      res.status(404).json({ success: false, message: "Application not found." });
      return;
    }

    const candidate = req.user?.role === "CANDIDATE" ? null : await prisma.user.findUnique({
      where: { id: application.uploadedBy },
      select: { id: true, username: true, firstName: true, lastName: true, email: true },
    });

    res.json({
      success: true,
      data: {
        applicationId: application.id,
        jobId: application.opening.id,
        jobTitle: application.opening.title,
        companyName: application.opening.tenant?.companyName || "Organization",
        location: application.opening.location || "Remote",
        status: application.status,
        submittedAt: application.submittedAt,
        analysisIssue: formatPublicAnalysisIssue(application),
        candidate: candidate ? {
          id: candidate.id,
          name: [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.username,
          email: candidate.email,
        } : null,
        aiScreening: formatPublicRecommendation(application),
      },
    });
  } catch (error) {
    console.error("[RecruiterController] Error fetching candidate score:", error);
    res.status(500).json({ success: false, message: "Failed to fetch candidate score." });
  }
}

/**
 * Get all candidate applications for a specific job opening
 * Includes AI screening score, recommendation band, confidence, explanation, and Google Cloud Storage resume preview URL.
 */
export async function getCandidatesForJob(req: Request, res: Response): Promise<void> {
  try {
    const openingId = String(req.params.id);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const requestedStatus = typeof req.query.status === "string" ? req.query.status : undefined;
    const status = (["SUBMITTED", "SHORTLISTED", "REJECTED"] as const).find(
      (profileStatus) => profileStatus === requestedStatus,
    );

    const scope = getOpeningScope(req.user);
    if (!scope) {
      res.status(403).json({ success: false, message: "A tenant-scoped recruiting account is required." });
      return;
    }

    const opening = await prisma.opening.findFirst({ where: { id: openingId, ...scope } });

    if (!opening) {
      res.status(404).json({ success: false, message: "Job opening not found." });
      return;
    }

    const where = { openingId, isDeleted: false, ...(status ? { status } : {}) };
    const [totalCandidates, applications] = await Promise.all([
      prisma.hiringProfile.count({ where }),
      prisma.hiringProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { recommendationScore: { sort: "desc", nulls: "last" } },
          { submittedAt: "desc" },
        ],
      }),
    ]);

    const candidateIds = [...new Set(applications.map((application) => application.uploadedBy))];
    const candidateUsers = await prisma.user.findMany({
      where: { id: { in: candidateIds }, tenantId: opening.tenantId },
      select: { id: true, username: true, email: true, firstName: true, lastName: true, phoneNumber: true, role: true },
    });
    const usersById = new Map(candidateUsers.map((candidate) => [candidate.id, candidate]));

    const storage = createStorageService();

    const formatted = await Promise.all(
      applications.map(async (app) => {
        let resumeUrl: string | null = null;
        try {
          resumeUrl = await storage.getObjectURL(app.s3Key);
        } catch {
          resumeUrl = null;
        }

        const candidateUser = usersById.get(app.uploadedBy);

        let recommendationBand = "Pending";
        if (app.recommendationScore !== null && app.recommendationScore !== undefined) {
          if (app.recommendationScore >= 0.75) recommendationBand = "Recommended";
          else if (app.recommendationScore >= 0.5) recommendationBand = "Borderline";
          else recommendationBand = "Not Recommended";
        }

        return {
          applicationId: app.id,
          candidate: {
            id: candidateUser?.role === "CANDIDATE" ? candidateUser.id : null,
            name: candidateUser?.role === "CANDIDATE"
              ? `${candidateUser.firstName || ""} ${candidateUser.lastName || ""}`.trim() || candidateUser.username
              : typeof app.resumeAnalysis === "object" && app.resumeAnalysis !== null
                && "candidateName" in app.resumeAnalysis
                && typeof app.resumeAnalysis.candidateName === "string"
                && app.resumeAnalysis.candidateName !== "UNKNOWN"
                ? app.resumeAnalysis.candidateName
                : "Candidate profile",
            email: candidateUser?.role === "CANDIDATE" ? candidateUser.email : null,
            mobileNumber: candidateUser?.role === "CANDIDATE" ? candidateUser.phoneNumber : null,
          },
          resume: {
            key: app.s3Key,
            previewUrl: resumeUrl,
            fileName: app.s3Key.split("/").pop() || "resume.pdf",
          },
          aiScreening: {
            status: app.recommendationStatus,
            recommended: app.recommended,
            band: recommendationBand,
            score: app.recommendationScore !== null ? Math.round(app.recommendationScore * 100) : null,
            recommendationScore: app.recommendationScore,
            confidence: app.recommendationConfidence !== null ? Math.round(app.recommendationConfidence * 100) : null,
            recommendationConfidence: app.recommendationConfidence,
            atsScore: app.atsScore,
            atsBreakdown: app.atsBreakdown,
            resumeAnalysis: app.resumeAnalysis,
            reason: app.recommendationReason,
            latencyMs: app.recommendationLatencyMs,
            version: app.recommendationVersion,
          },
          status: app.status,
          submittedAt: app.submittedAt,
          shortlistedAt: app.shortlistedAt,
          rejectedAt: app.rejectedAt,
        };
      })
    );

    res.json({
      success: true,
      job: {
        id: opening.id,
        title: opening.title,
        status: opening.status,
        experienceMin: opening.experienceMin,
        experienceMax: opening.experienceMax,
        location: opening.location,
      },
      totalCandidates,
      pagination: { page, limit, total: totalCandidates, totalPages: Math.ceil(totalCandidates / limit) },
      candidates: formatted,
    });
    return;
  } catch (error: any) {
    console.error("[RecruiterController] Error fetching candidates:", error);
    res.status(500).json({ success: false, message: "Failed to fetch candidates" });
    return;
  }
}

/**
 * Shortlist a candidate application
 */
export async function shortlistCandidate(req: Request, res: Response): Promise<void> {
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
    res.json({ success: true, message: "Candidate decision saved.", data: { applicationId: profile.id, status: profile.status, shortlistedAt: profile.shortlistedAt, rejectedAt: profile.rejectedAt } });
  } catch {
    res.status(500).json({ success: false, message: "Failed to save candidate decision." });
  }
}

export async function rejectCandidate(req: Request, res: Response): Promise<void> {
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
    res.json({ success: true, message: "Candidate decision saved.", data: { applicationId: profile.id, status: profile.status, shortlistedAt: profile.shortlistedAt, rejectedAt: profile.rejectedAt } });
  } catch {
    res.status(500).json({ success: false, message: "Failed to save candidate decision." });
  }
}
