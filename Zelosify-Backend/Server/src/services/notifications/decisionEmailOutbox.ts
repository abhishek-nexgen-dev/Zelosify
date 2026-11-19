import { ProfileStatus } from "@prisma/client";
import prisma from "../../config/prisma/prisma.js";
import { ENV } from "../../config/env.js";
import { buildCandidateDecisionEmail, type CandidateDecision } from "./candidateDecisionEmailTemplates.js";
import { isDecisionEmailConfigured, sendDecisionEmail } from "./decisionEmailMailer.js";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 2 * 60 * 1000;
const BATCH_SIZE = 25;
let workerRunning = false;

type QueueEntry = {
  id: string;
  applicationId: number;
  decision: CandidateDecision;
  attemptCount: number;
};

function retryDelay(attemptCount: number): number {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attemptCount - 1));
}

async function markSkipped(id: string, lastErrorCode: string): Promise<void> {
  await prisma.decisionEmailOutbox.update({
    where: { id },
    data: { status: "SKIPPED", lockedUntil: null, lastErrorCode },
  });
}

async function releaseForRetry(entry: QueueEntry, errorCode: string): Promise<void> {
  const attemptCount = entry.attemptCount;
  await prisma.decisionEmailOutbox.update({
    where: { id: entry.id },
    data: {
      status: attemptCount >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
      attemptCount,
      lockedUntil: null,
      nextAttemptAt: new Date(Date.now() + retryDelay(attemptCount)),
      lastErrorCode: errorCode,
    },
  });
  console.error(JSON.stringify({
    level: "error",
    event: "CANDIDATE_DECISION_EMAIL_FAILED",
    errorCode,
    attemptCount,
    terminal: attemptCount >= MAX_ATTEMPTS,
  }));
}

async function processEntry(entry: QueueEntry): Promise<void> {
  const now = new Date();
  const claim = await prisma.decisionEmailOutbox.updateMany({
    where: {
      id: entry.id,
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "PROCESSING", lockedUntil: { lte: now } },
      ],
    },
    data: {
      status: "PROCESSING",
      attemptCount: { increment: 1 },
      lockedUntil: new Date(now.getTime() + LOCK_MS),
    },
  });
  if (!claim.count) return;
  const claimedEntry = { ...entry, attemptCount: entry.attemptCount + 1 };

  try {
    const profile = await prisma.hiringProfile.findFirst({
      where: { id: entry.applicationId, isDeleted: false, status: entry.decision },
      select: {
        uploadedBy: true,
        opening: { select: { title: true, tenant: { select: { companyName: true } } } },
      },
    });
    if (!profile) {
      await markSkipped(entry.id, "APPLICATION_NOT_ACTIVE");
      return;
    }
    const candidate = await prisma.user.findUnique({
      where: { id: profile.uploadedBy },
      select: { email: true, firstName: true, lastName: true },
    });
    if (!candidate?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
      await markSkipped(entry.id, "RECIPIENT_UNAVAILABLE");
      return;
    }
    const candidateName = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Candidate";
    const email = buildCandidateDecisionEmail({
      candidateName,
      jobTitle: profile.opening.title,
      companyName: profile.opening.tenant.companyName,
      decision: entry.decision,
    });
    const delivery = await sendDecisionEmail(candidate.email, email);
    if (delivery.status === "SENT") {
      await prisma.decisionEmailOutbox.update({
        where: { id: entry.id },
        data: { status: "SENT", sentAt: new Date(), lockedUntil: null, lastErrorCode: null },
      });
      console.log(JSON.stringify({ level: "info", event: "CANDIDATE_DECISION_EMAIL_SENT", decision: entry.decision }));
      return;
    }
    if (delivery.status === "NOT_CONFIGURED") {
      await prisma.decisionEmailOutbox.update({
        where: { id: entry.id },
        data: { status: "PENDING", attemptCount: entry.attemptCount, lockedUntil: null, lastErrorCode: "SMTP_NOT_CONFIGURED", nextAttemptAt: new Date(Date.now() + 15 * 60 * 1000) },
      });
      return;
    }
    await releaseForRetry(claimedEntry, delivery.errorCode);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9_-]{1,40}$/i.test(error.code)
      ? error.code.toUpperCase()
      : "DECISION_EMAIL_PROCESSING_FAILED";
    await releaseForRetry(claimedEntry, code).catch(() => undefined);
  }
}

export async function processPendingDecisionEmails(): Promise<void> {
  if (workerRunning || !isDecisionEmailConfigured()) return;
  workerRunning = true;
  try {
    const now = new Date();
    const entries = await prisma.decisionEmailOutbox.findMany({
      where: {
        decision: { in: [ProfileStatus.SHORTLISTED, ProfileStatus.REJECTED] },
        OR: [
          { status: "PENDING", nextAttemptAt: { lte: now } },
          { status: "PROCESSING", lockedUntil: { lte: now } },
        ],
      },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: BATCH_SIZE,
      select: { id: true, applicationId: true, decision: true, attemptCount: true },
    });
    for (const entry of entries) {
      if (!isCandidateDecision(entry.decision)) {
        await markSkipped(entry.id, "UNSUPPORTED_DECISION");
        continue;
      }
      await processEntry({ ...entry, decision: entry.decision });
    }
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9_-]{1,40}$/i.test(error.code)
      ? error.code.toUpperCase()
      : "DECISION_EMAIL_OUTBOX_SCAN_FAILED";
    console.error(JSON.stringify({ level: "error", event: "DECISION_EMAIL_OUTBOX_SCAN_FAILED", errorCode: code }));
  } finally {
    workerRunning = false;
  }
}

export function scheduleDecisionEmailProcessing(): void {
  setImmediate(() => { void processPendingDecisionEmails(); });
}

export function startDecisionEmailWorker(): void {
  if (!isDecisionEmailConfigured()) {
    console.warn(JSON.stringify({ level: "warn", event: "CANDIDATE_DECISION_EMAILS_DISABLED", errorCode: "SMTP_NOT_CONFIGURED" }));
  }
  void processPendingDecisionEmails();
  setInterval(() => { void processPendingDecisionEmails(); }, ENV.DECISION_EMAIL_WORKER_INTERVAL_MS).unref();
}

export function isCandidateDecision(value: string): value is CandidateDecision {
  return value === ProfileStatus.SHORTLISTED || value === ProfileStatus.REJECTED;
}
