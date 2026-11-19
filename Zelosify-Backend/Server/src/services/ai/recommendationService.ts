import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma/prisma.js";
import { RecommendationProviderError, ResumeIdentityMismatchError, runRecommendationAgent } from "./agentOrchestrator.js";
import { RecommendationToolExecutionError } from "./toolRegistry.js";
import { createStorageService } from "../storage/storageFactory.js";
import type { OpeningCriteria } from "./tools/matchingEngine.js";
import { ENV } from "../../config/env.js";






async function fetchResumeBuffer(s3Key: string): Promise<Buffer> {
  const storageService = createStorageService();
  const stream = await storageService.getObjectStream(s3Key);
  const timer = setTimeout(() => stream.destroy(new Error("Resume read timed out")), 5000);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for await (const chunk of stream) {
      const part = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      bytes += part.length;
      if (bytes > 10 * 1024 * 1024) throw new Error("Resume exceeds processing limit");
      chunks.push(part);
    }
  } finally { clearTimeout(timer); stream.destroy(); }
  return Buffer.concat(chunks);
}




export async function processProfileRecommendation(profileId: number): Promise<void> {
  const profile = await prisma.hiringProfile.findUnique({
    where: { id: profileId },
    include: { opening: true },
  });

  if (!profile || !profile.opening || profile.isDeleted) {
    console.warn(JSON.stringify({ level: "warn", event: "AI_RECOMMENDATION_PROFILE_NOT_FOUND", profileId }));
    return;
  }

  const runId = randomUUID();
  const claimed = await prisma.hiringProfile.updateMany({
    where: {
      id: profileId,
      s3Key: profile.s3Key,
      isDeleted: false,
      recommendationAttempts: { lt: 3 },
      recommendationStatus: { in: ["PENDING", "FAILED"] },
    },
    data: { recommendationStatus: "PROCESSING", recommendationRunId: runId, recommendationStartedAt: new Date(), recommendationAttempts: { increment: 1 } },
  });
  if (claimed.count === 0) return;

  const opening = profile.opening;
  const filename = profile.s3Key.split("/").pop() || `resume_${profileId}.pdf`;

  const openingCriteria: OpeningCriteria = {
    experienceMin: opening.experienceMin,
    experienceMax: opening.experienceMax,
    location: opening.location,
    requiredSkills: opening.requiredSkills,
  };

  try {
    const uploader = await prisma.user.findUnique({
      where: { id: profile.uploadedBy },
      select: { role: true, firstName: true, lastName: true },
    });
    let expectedCandidateName: string | undefined;
    if (uploader?.role === "CANDIDATE") {
      expectedCandidateName = [uploader.firstName, uploader.lastName].filter(Boolean).join(" ").trim();
      if (!expectedCandidateName) throw new ResumeIdentityMismatchError();
    } else if (uploader?.role !== "IT_VENDOR") {
      throw new Error("Resume uploader role cannot submit this profile.");
    }
    const recommendation = await runRecommendationAgent(
      () => fetchResumeBuffer(profile.s3Key),
      filename,
      openingCriteria,
      expectedCandidateName,
    );


    const persisted = await prisma.$transaction(async (tx) => {
      const result = await tx.hiringProfile.updateMany({
        where: { id: profileId, s3Key: profile.s3Key, recommendationStatus: "PROCESSING", recommendationRunId: runId, isDeleted: false },
        data: {
          recommended: recommendation.recommended,
          recommendationScore: recommendation.score,
          recommendationReason: recommendation.reason,
          recommendationLatencyMs: recommendation.latencyMs,
          recommendationVersion: recommendation.version,
          recommendationConfidence: recommendation.confidence,
          atsScore: recommendation.atsScore,
          atsBreakdown: {
            scale: 100,
            skillMatch: Math.round(recommendation.metadata.matchingResult.skillMatchScore * 100),
            experienceMatch: Math.round(recommendation.metadata.matchingResult.experienceMatchScore * 100),
            locationMatch: Math.round(recommendation.metadata.matchingResult.locationMatchScore * 100),
            formula: "50% skills + 30% experience + 20% location",
          },
          resumeAnalysis: {
            candidateName: recommendation.candidateName === "UNKNOWN" ? null : recommendation.candidateName,
            experienceYears: recommendation.metadata.extractedFeatures.experienceYears,
            skills: recommendation.metadata.extractedFeatures.skills,
            normalizedSkills: recommendation.metadata.extractedFeatures.normalizedSkills,
            location: recommendation.metadata.extractedFeatures.location,
            education: recommendation.metadata.extractedFeatures.education,
            keywords: recommendation.metadata.extractedFeatures.keywords,
          },
          recommendedAt: new Date(),
          recommendationStatus: "COMPLETED",
          recommendationMetadata: {
            model: recommendation.metadata.model,
            provider: recommendation.metadata.provider || "groq-tool-calling",
            startTime: recommendation.metadata.startTime,
            tokenUsage: recommendation.metadata.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            tools: recommendation.metadata.toolExecutions.map((step) => ({ name: step.name, durationMs: step.durationMs, status: step.status })),
          },
        },
      });
      return result.count > 0;
    });
    if (!persisted) return;

    console.log(JSON.stringify({ level: "info", event: "AI_RECOMMENDATION_PERSISTED", profileId }));
  } catch (error) {
    const providerError = error instanceof RecommendationProviderError ? error : undefined;
    const toolError = error instanceof RecommendationToolExecutionError ? error : undefined;
    const identityError = error instanceof ResumeIdentityMismatchError ? error : undefined;
    const failureCode = identityError?.errorCode ?? providerError?.errorCode ?? toolError?.errorCode ?? "PROCESSING_FAILED";
    const provider = providerError?.provider ?? ENV.AI_AGENT_PROVIDER;
    const model = providerError?.model ?? (provider === "gemini" ? ENV.GEMINI_MODEL : provider === "grok" || provider === "xai" ? ENV.GROK_MODEL : ENV.GROQ_MODEL);
    console.error(JSON.stringify({
      level: "error", event: "AI_RECOMMENDATION_FAILED", profileId, runId,
      errorCode: failureCode, provider, model,
      ...(providerError?.httpStatus ? { httpStatus: providerError.httpStatus } : {}),
    }));

    await prisma.hiringProfile.updateMany({
      where: { id: profileId, s3Key: profile.s3Key, recommendationStatus: "PROCESSING", recommendationRunId: runId, isDeleted: false },
      data: {
        recommended: null,
        recommendationScore: null,
        recommendationConfidence: null,
        atsScore: null,
        atsBreakdown: Prisma.JsonNull,
        resumeAnalysis: Prisma.JsonNull,
        recommendationReason: identityError
          ? "The name on this resume could not be verified against your candidate profile."
          : "Evaluation encountered a temporary processing issue. Please retry.",
        recommendationLatencyMs: null,
        recommendationVersion: "v1.4.0-error",
        recommendationMetadata: {
          failure: {
            errorCode: failureCode,
            provider,
            model,
            ...(providerError?.httpStatus ? { httpStatus: providerError.httpStatus } : {}),
            occurredAt: new Date().toISOString(),
          },
        },
        recommendedAt: null,
        recommendationStatus: "FAILED",
      },
    }).catch((persistenceError: unknown) => {
      const code = typeof persistenceError === "object" && persistenceError !== null && "code" in persistenceError
        ? String(persistenceError.code)
        : undefined;
      console.error(JSON.stringify({
        level: "error",
        event: "AI_RECOMMENDATION_FAILURE_PERSIST_FAILED",
        profileId,
        ...(code && /^[A-Z][A-Z0-9_]{1,30}$/.test(code) ? { errorCode: code } : {}),
      }));
    });
  }
}




const queued = new Set<number>();
let active = 0;
function drainRecommendations(): void {
  while (active < 2 && queued.size) {
    const profileId = queued.values().next().value;
    if (profileId === undefined) break;
    queued.delete(profileId);
    active += 1;
    void processProfileRecommendation(profileId).catch(() => {
      console.error(JSON.stringify({ level: "error", event: "RECOMMENDATION_DISPATCH_FAILED", profileId }));
    }).finally(() => { active -= 1; drainRecommendations(); });
  }
}

export function triggerAsyncRecommendation(profileId: number): void {
  // PENDING rows remain in PostgreSQL if the bounded in-memory dispatch set is full.
  if (queued.size < 1000) queued.add(profileId);
  setImmediate(drainRecommendations);
}

let recoveryRunning = false;
let recoveryUnavailableLogged = false;
export async function recoverPendingRecommendations(): Promise<void> {
  if (recoveryRunning) return;
  recoveryRunning = true;
  try {
    const stale = { isDeleted: false, recommendationStatus: "PROCESSING" as const,
      OR: [{ recommendationStartedAt: null }, { recommendationStartedAt: { lt: new Date(Date.now() - 120_000) } }] };
    await prisma.hiringProfile.updateMany({ where: { ...stale, recommendationAttempts: { gte: 3 } }, data: { recommendationStatus: "FAILED", recommendationReason: "Processing interrupted repeatedly. Replace the resume to retry." } });
    await prisma.hiringProfile.updateMany({ where: { ...stale, recommendationAttempts: { lt: 3 } }, data: { recommendationStatus: "PENDING", recommendationRunId: null } });
    const pending = await prisma.hiringProfile.findMany({
      where: { isDeleted: false, recommendationStatus: "PENDING", recommendationAttempts: { lt: 3 } },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }], take: 100,
      select: { id: true },
    });
    for (const profile of pending) triggerAsyncRecommendation(profile.id);
    if (recoveryUnavailableLogged) {
      console.info(JSON.stringify({ level: "info", event: "RECOMMENDATION_RECOVERY_RESTORED" }));
    }
    recoveryUnavailableLogged = false;
  } catch (error: unknown) {
    if (!recoveryUnavailableLogged) {
      const message = error instanceof Error ? error.message : String(error);
      const safeMessage = message.replace(/(postgres(?:ql)?:\/\/)[^@/\s]+@/gi, "$1[redacted]@");
      const code = typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;
      console.error(JSON.stringify({
        level: "error",
        event: "RECOMMENDATION_RECOVERY_UNAVAILABLE",
        ...(code ? { errorCode: code } : {}),
        error: safeMessage,
      }));
      recoveryUnavailableLogged = true;
    }
  } finally { recoveryRunning = false; }
}
