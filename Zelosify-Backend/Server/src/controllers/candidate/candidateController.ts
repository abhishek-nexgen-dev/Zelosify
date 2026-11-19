import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../../config/prisma/prisma.js";
import { triggerAsyncRecommendation } from "../../services/ai/recommendationService.js";
import { createStorageService } from "../../services/storage/storageFactory.js";
import { enqueueStorageDeletion, scheduleStorageCleanup } from "../../services/storage/storageCleanupService.js";
import { randomUUID } from "node:crypto";
import { sanitizeFilename } from "../../helpers/vendorRequestValidation.js";
import { formatPublicAnalysisIssue, formatPublicRecommendation } from "../../utils/ai/publicRecommendation.js";
import { inspectResumeBuffer, MAX_RESUME_PAGES, MAX_RESUME_TEXT_CHARACTERS } from "../../services/ai/tools/resumeParser.js";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;

function getResumePrefix(user: Request["user"]): string | null {
  if (!user?.id || !user.tenantId) return null;
  return `candidate-resumes/${user.tenantId}/${user.id}/`;
}

function getRequiredContentType(filename: string): string | null {
  if (/\.pdf$/i.test(filename)) return "application/pdf";
  if (/\.doc$/i.test(filename)) return "application/msword";
  if (/\.docx$/i.test(filename)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return null;
}

function hasExpectedBufferSignature(buffer: Buffer, contentType: string): boolean {
  if (contentType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (contentType === "application/msword") return buffer.length >= 8 && buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
}

async function validateResumeContent(buffer: Buffer, filename: string): Promise<string | null> {
  let inspection;
  try {
    inspection = await inspectResumeBuffer(buffer, filename);
  } catch {
    return "Resume could not be read. Upload a readable PDF, DOC, or DOCX file.";
  }
  if (inspection.pageCount === null) {
    return "We could not verify this file's page count. Please save it with page information or upload it as a PDF.";
  }
  if (inspection.pageCount > MAX_RESUME_PAGES) {
    return "Resume must be 2 pages or fewer. Please shorten it to one or two pages and upload again.";
  }
  if (inspection.characterCount > MAX_RESUME_TEXT_CHARACTERS) {
    return "Resume contains too much text. Keep it to 12,000 characters or fewer and within 1 or 2 pages, then upload again.";
  }
  return null;
}

async function cleanupUncommittedResume(key: string): Promise<void> {
  try {
    await createStorageService().deleteObject(key);
  } catch {
    try {
      await prisma.$transaction((tx) => enqueueStorageDeletion(tx, key));
      scheduleStorageCleanup();
    } catch {
      console.error(JSON.stringify({ level: "error", event: "APPLICATION_RESUME_CLEANUP_FAILED" }));
    }
  }
}

async function getCandidateApplicationSummary(candidateId: string) {
  const rows = await prisma.hiringProfile.groupBy({
    by: ["status", "recommendationStatus"],
    where: { uploadedBy: candidateId, isDeleted: false },
    _count: { _all: true },
  });

  return rows.reduce(
    (counts, row) => {
      const count = row._count._all;
      counts.total += count;
      if (row.status === "SUBMITTED") counts.inReview += count;
      if (row.status === "SHORTLISTED") counts.shortlisted += count;
      if (row.recommendationStatus === "PENDING" || row.recommendationStatus === "PROCESSING") {
        counts.screening += count;
      }
      return counts;
    },
    { total: 0, inReview: 0, shortlisted: 0, screening: 0 },
  );
}

/**
 * Apply for a Job Opening
 * Candidate uploads a fresh resume file for this opening
 * Triggers async AI resume screening with Gemini
 */
export async function applyForJob(req: Request, res: Response): Promise<void> {
  let uncommittedResumeKey: string | undefined;
  try {
    const candidateId = req.user?.id;
    const openingId = String(req.params.id);
    let s3Key: string | undefined;

    if (!candidateId) {
      res.status(401).json({ success: false, message: "Authentication required to apply for jobs." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "Attach a resume file to submit your application." });
      return;
    }

    const safeFilename = sanitizeFilename(req.file.originalname);
    const expectedType = safeFilename ? getRequiredContentType(safeFilename) : null;
    if (!safeFilename || !expectedType || expectedType !== req.file.mimetype || req.file.size <= 0 || req.file.size > MAX_RESUME_BYTES || !hasExpectedBufferSignature(req.file.buffer, expectedType)) {
      res.status(422).json({ success: false, message: "Resume must be a valid PDF, DOC, or DOCX file smaller than 10 MB." });
      return;
    }
    const contentError = await validateResumeContent(req.file.buffer, safeFilename);
    if (contentError) {
      res.status(422).json({ success: false, message: contentError });
      return;
    }
    const prefix = getResumePrefix(req.user);
    if (!prefix) {
      res.status(403).json({ success: false, message: "A tenant-linked candidate account is required." });
      return;
    }
    s3Key = `${prefix}${randomUUID()}-${safeFilename}`;

    // Verify opening exists and is active
    const opening = await prisma.opening.findUnique({
      where: { id: openingId },
    });

    if (!opening) {
      res.status(404).json({ success: false, message: "Job opening not found." });
      return;
    }

    if (opening.status !== "OPEN") {
      res.status(400).json({ success: false, message: "This job opening is no longer accepting applications." });
      return;
    }

    const existingApplication = await prisma.hiringProfile.findFirst({
      where: { openingId, uploadedBy: candidateId, isDeleted: false },
      select: { id: true },
    });
    if (existingApplication) {
      res.status(409).json({ success: false, message: "You have already applied for this opening." });
      return;
    }

    uncommittedResumeKey = s3Key;
    try {
      await createStorageService().putObject(s3Key, req.file.buffer, req.file.mimetype);
    } catch {
      await cleanupUncommittedResume(uncommittedResumeKey);
      uncommittedResumeKey = undefined;
      res.status(503).json({ success: false, message: "Resume storage is unavailable. Try again later." });
      return;
    }

    const application = await prisma.$transaction(async (tx) => {
      const activeOpening = await tx.opening.findFirst({ where: { id: openingId, status: "OPEN" } });
      if (!activeOpening) return null;
      const existing = await tx.hiringProfile.findFirst({ where: { openingId, uploadedBy: candidateId, isDeleted: false } });
      if (existing) return null;
      return tx.hiringProfile.create({
        data: { openingId, s3Key, uploadedBy: candidateId, status: "SUBMITTED" },
        include: { opening: { select: { title: true, location: true, contractType: true } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!application) {
      if (uncommittedResumeKey) await cleanupUncommittedResume(uncommittedResumeKey);
      uncommittedResumeKey = undefined;
      res.status(409).json({ success: false, message: "Already applied or opening no longer accepts applications." });
      return;
    }
    uncommittedResumeKey = undefined;

    // Parse the fresh upload and start a job-specific AI screening run.
    triggerAsyncRecommendation(application.id);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully! Your resume is now being screened.",
      data: {
        applicationId: application.id,
        jobTitle: application.opening.title,
        status: application.status,
        submittedAt: application.submittedAt,
        screeningStatus: application.recommendationStatus,
      },
    });
    return;
  } catch (error: any) {
    if (uncommittedResumeKey) await cleanupUncommittedResume(uncommittedResumeKey);
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
      res.status(409).json({ success: false, message: "Application changed concurrently or was already submitted. Refresh before retrying." });
      return;
    }
    console.error("[CandidateController] Error applying for job");
    res.status(500).json({ success: false, message: "Failed to apply for job" });
    return;
  }
}

/**
 * Get all job applications for authenticated candidate
 */
export async function getMyApplications(req: Request, res: Response): Promise<void> {
  try {
    const candidateId = req.user?.id;
    if (!candidateId) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      res.status(400).json({ success: false, message: "page must be a positive integer; limit must be 1..100." });
      return;
    }
    const owner = { uploadedBy: candidateId, isDeleted: false };
    const [summary, applications] = await Promise.all([
      getCandidateApplicationSummary(candidateId),
      prisma.hiringProfile.findMany({
        where: owner,
        include: {
          opening: {
            select: {
              id: true,
              title: true,
              location: true,
              contractType: true,
              status: true,
              tenant: { select: { companyName: true } },
            },
          },
        },
        orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const storage = createStorageService();

    const formatted = await Promise.all(
      applications.map(async (app) => {
        let resumeUrl: string | null = null;
        try {
          resumeUrl = await storage.getObjectURL(app.s3Key);
        } catch {
          resumeUrl = null;
        }

        return {
          applicationId: app.id,
          jobId: app.opening.id,
          jobTitle: app.opening.title,
          companyName: app.opening.tenant?.companyName || "Bruce Wayne Corp",
          location: app.opening.location || "Remote",
          status: app.status,
          screeningStatus: app.recommendationStatus,
          analysisIssue: formatPublicAnalysisIssue(app),
          analysisRetryAvailable: app.recommendationStatus === "FAILED"
            && app.recommendationAttempts < 3
            && (app.recommendationMetadata as { failure?: { errorCode?: string } } | null)?.failure?.errorCode !== "RESUME_IDENTITY_MISMATCH",
          aiScreening: formatPublicRecommendation(app),
          submittedAt: app.submittedAt,
          resumeUrl,
        };
      })
    );

    res.json({
      success: true,
      count: summary.total,
      pagination: { page, limit, total: summary.total, totalPages: Math.max(1, Math.ceil(summary.total / limit)) },
      summary,
      data: formatted,
    });
    return;
  } catch (error: any) {
    console.error("[CandidateController] Error fetching applications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
    return;
  }
}

/** Return recommendation details only for an application owned by the signed-in candidate. */
export async function getMyApplicationScore(req: Request, res: Response): Promise<void> {
  const candidateId = req.user?.id;
  const applicationId = Number(req.params.id);
  if (!candidateId) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
    res.status(400).json({ success: false, message: "Valid application ID required." });
    return;
  }

  try {
    const application = await prisma.hiringProfile.findFirst({
      where: { id: applicationId, uploadedBy: candidateId, isDeleted: false },
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
        aiScreening: formatPublicRecommendation(application),
      },
    });
  } catch (error) {
    console.error("[CandidateController] Error fetching application score:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resume analysis." });
  }
}

/** Retry a failed analysis for the authenticated candidate's own application. */
export async function retryMyApplicationAnalysis(req: Request, res: Response): Promise<void> {
  const candidateId = req.user?.id;
  const applicationId = Number(req.params.id);
  if (!candidateId) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
    res.status(400).json({ success: false, message: "Valid application ID required." });
    return;
  }

  try {
    const application = await prisma.hiringProfile.findFirst({
      where: { id: applicationId, uploadedBy: candidateId, isDeleted: false },
      select: { id: true, recommendationStatus: true, recommendationAttempts: true, recommendationMetadata: true },
    });
    if (!application) {
      res.status(404).json({ success: false, message: "Application not found." });
      return;
    }
    if (application.recommendationStatus === "COMPLETED") {
      res.status(409).json({ success: false, message: "Resume analysis is already complete." });
      return;
    }
    const failureMetadata = application.recommendationMetadata as { failure?: { errorCode?: string } } | null;
    if (failureMetadata?.failure?.errorCode === "RESUME_IDENTITY_MISMATCH") {
      res.status(409).json({ success: false, message: "The resume name does not match your candidate profile. Confirm your profile details or choose the correct resume." });
      return;
    }
    if (application.recommendationStatus === "FAILED" && application.recommendationAttempts >= 3) {
      res.status(429).json({ success: false, message: "Analysis retry limit reached. Contact support for help." });
      return;
    }

    triggerAsyncRecommendation(application.id);
    res.status(202).json({ success: true, message: "Resume analysis has been queued." });
  } catch {
    res.status(500).json({ success: false, message: "Could not retry resume analysis." });
  }
}

/**
 * Update resume for an existing application
 */
export async function updateResume(req: Request, res: Response): Promise<void> {
  const candidateId = req.user?.id;
  const applicationId = Number(req.params.id);
  const prefix = getResumePrefix(req.user);
  const uploadedFile = req.file;
  let replacementKey: string | undefined;
  let uploadedNewObject = false;

  const cleanupUncommittedUpload = async () => {
    const orphanKey = replacementKey;
    if (!uploadedNewObject || !orphanKey) return;
    try {
      await createStorageService().deleteObject(orphanKey);
    } catch {
      try {
        await prisma.$transaction((tx) => enqueueStorageDeletion(tx, orphanKey));
        scheduleStorageCleanup();
      } catch {
        console.error(JSON.stringify({ level: "error", event: "RESUME_REPLACEMENT_ORPHAN_CLEANUP_FAILED" }));
      }
    }
  };

  if (!candidateId || !prefix || !Number.isSafeInteger(applicationId) || applicationId < 1) {
    res.status(400).json({ success: false, message: "Valid application ID and candidate authentication are required." });
    return;
  }

  if (uploadedFile) {
    const safeFilename = sanitizeFilename(uploadedFile.originalname);
    const expectedType = safeFilename ? getRequiredContentType(safeFilename) : null;
    if (!safeFilename || !expectedType || expectedType !== uploadedFile.mimetype || uploadedFile.size <= 0 || uploadedFile.size > MAX_RESUME_BYTES || !hasExpectedBufferSignature(uploadedFile.buffer, expectedType)) {
      res.status(422).json({ success: false, message: "Resume must be a valid PDF, DOC, or DOCX file smaller than 10 MB." });
      return;
    }
    const contentError = await validateResumeContent(uploadedFile.buffer, safeFilename);
    if (contentError) {
      res.status(422).json({ success: false, message: contentError });
      return;
    }
    replacementKey = `${prefix}${randomUUID()}-${safeFilename}`;
    uploadedNewObject = true;
    try {
      await createStorageService().putObject(replacementKey, uploadedFile.buffer, expectedType);
    } catch {
      await cleanupUncommittedUpload();
      res.status(503).json({ success: false, message: "Resume storage is unavailable. Try again later." });
      return;
    }
  } else {
    res.status(400).json({ success: false, message: "Attach a replacement resume file." });
    return;
  }

  if (!replacementKey) {
    res.status(400).json({ success: false, message: "Attach a replacement resume file." });
    return;
  }
  const newResumeKey = replacementKey;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.hiringProfile.findFirst({
        where: { id: applicationId, uploadedBy: candidateId, isDeleted: false, s3Key: { startsWith: prefix } },
        select: { id: true, s3Key: true },
      });
      if (!current) return { outcome: "NOT_FOUND" as const };

      const changed = await tx.hiringProfile.updateMany({
        where: { id: current.id, uploadedBy: candidateId, isDeleted: false, s3Key: current.s3Key },
        data: {
          s3Key: newResumeKey,
          submittedAt: new Date(),
          status: "SUBMITTED",
          recommended: null,
          recommendationScore: null,
          recommendationReason: null,
          recommendationConfidence: null,
          atsScore: null,
          atsBreakdown: Prisma.JsonNull,
          resumeAnalysis: Prisma.JsonNull,
          recommendationLatencyMs: null,
          recommendationVersion: null,
          recommendedAt: null,
          recommendationStatus: "PENDING",
          recommendationRunId: null,
          recommendationStartedAt: null,
          recommendationAttempts: 0,
          recommendationMetadata: Prisma.DbNull,
          shortlistedBy: null,
          shortlistedAt: null,
          rejectedBy: null,
          rejectedAt: null,
        },
      });
      if (changed.count !== 1) return { outcome: "CONFLICT" as const };
      if (current.s3Key !== newResumeKey) await enqueueStorageDeletion(tx, current.s3Key);
      return { outcome: "UPDATED" as const, oldKeyQueued: current.s3Key !== newResumeKey };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.outcome !== "UPDATED") {
      await cleanupUncommittedUpload();
      res.status(result.outcome === "NOT_FOUND" ? 404 : 409).json({
        success: false,
        message: result.outcome === "NOT_FOUND" ? "Application not found or unauthorized." : "Application changed during replacement. Refresh and try again.",
      });
      return;
    }

    uploadedNewObject = false;
    triggerAsyncRecommendation(applicationId);
    if (result.oldKeyQueued) scheduleStorageCleanup();
    res.json({
      success: true,
      message: "Resume updated successfully. Candidate re-screening initiated.",
      data: {
        applicationId,
        screeningStatus: "PENDING",
        storageCleanup: result.oldKeyQueued ? "PENDING" : "NOT_REQUIRED",
      },
    });
  } catch (error) {
    await cleanupUncommittedUpload();
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      res.status(409).json({ success: false, message: "Application changed during replacement. Refresh and try again." });
      return;
    }
    console.error(JSON.stringify({ level: "error", event: "CANDIDATE_RESUME_REPLACEMENT_FAILED" }));
    res.status(500).json({ success: false, message: "Failed to update resume" });
  }
}

export async function revokeApplication(req: Request, res: Response): Promise<void> {
  const candidateId = req.user?.id;
  const prefix = getResumePrefix(req.user);
  const applicationId = Number(req.params.id);
  if (!candidateId || !prefix || !Number.isSafeInteger(applicationId) || applicationId < 1) {
    res.status(400).json({ success: false, message: "Valid application ID and candidate authentication are required." });
    return;
  }

  try {
    const revoked = await prisma.$transaction(async (tx) => {
      const application = await tx.hiringProfile.findFirst({
        where: { id: applicationId, uploadedBy: candidateId, isDeleted: false, s3Key: { startsWith: prefix } },
        select: { id: true, s3Key: true },
      });
      if (!application) return false;
      const deleted = await tx.hiringProfile.deleteMany({
        where: { id: application.id, uploadedBy: candidateId, isDeleted: false, s3Key: application.s3Key },
      });
      if (deleted.count !== 1) return false;
      await enqueueStorageDeletion(tx, application.s3Key);
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!revoked) {
      res.status(404).json({ success: false, message: "Application not found or unauthorized." });
      return;
    }

    const summary = await getCandidateApplicationSummary(candidateId).catch(() => null);
    scheduleStorageCleanup();
    res.status(202).json({
      success: true,
      message: "Application withdrawn. Resume deletion is queued.",
      data: { applicationId, storageCleanup: "PENDING", summary },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      res.status(409).json({ success: false, message: "Application changed while being withdrawn. Refresh and try again." });
      return;
    }
    console.error(JSON.stringify({ level: "error", event: "CANDIDATE_APPLICATION_REVOKE_FAILED" }));
    res.status(500).json({ success: false, message: "Failed to withdraw application." });
  }
}
