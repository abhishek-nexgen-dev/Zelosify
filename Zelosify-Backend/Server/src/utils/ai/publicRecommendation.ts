type RecommendationFields = {
  recommendationStatus: string;
  recommendationMetadata: unknown;
  recommended: boolean | null;
  recommendationScore: number | null;
  recommendationConfidence: number | null;
  recommendationReason: string | null;
  recommendationLatencyMs: number | null;
  recommendationVersion: string | null;
  atsScore: number | null;
};

type RecommendationFailureFields = {
  recommendationStatus: string;
  recommendationMetadata: unknown;
};

/** Expose only the candidate-safe identity mismatch hint, never internal provider errors. */
export function formatPublicAnalysisIssue(profile: RecommendationFailureFields): string | null {
  if (profile.recommendationStatus !== "FAILED") return null;
  if (!profile.recommendationMetadata || typeof profile.recommendationMetadata !== "object") return null;
  const failure = (profile.recommendationMetadata as Record<string, unknown>).failure;
  if (!failure || typeof failure !== "object") return null;
  return (failure as Record<string, unknown>).errorCode === "RESUME_IDENTITY_MISMATCH"
    ? "IDENTITY_UNVERIFIED"
    : null;
}

function getPublicFailureReason(profile: RecommendationFailureFields): string {
  return formatPublicAnalysisIssue(profile) === "IDENTITY_UNVERIFIED"
    ? "The name on this resume could not be verified against your candidate profile. Check your profile name and replace the resume to request a fresh analysis."
    : "Evaluation encountered a temporary processing issue. Please retry.";
}

function getRecommendationBand(status: string, score: number | null): string {
  if (status === "FAILED") return "Analysis unavailable";
  if (status !== "COMPLETED" || score === null) return status === "PROCESSING" ? "Analyzing" : "Pending";
  if (score >= 0.75) return "Recommended";
  if (score >= 0.5) return "Borderline";
  return "Not Recommended";
}

export function formatPublicRecommendation(profile: RecommendationFields) {
  const completed = profile.recommendationStatus === "COMPLETED";
  return {
    status: profile.recommendationStatus,
    recommended: completed ? profile.recommended : null,
    band: getRecommendationBand(profile.recommendationStatus, profile.recommendationScore),
    score: completed && profile.recommendationScore !== null
      ? Math.round(profile.recommendationScore * 100)
      : null,
    confidence: completed && profile.recommendationConfidence !== null
      ? Math.round(profile.recommendationConfidence * 100)
      : null,
    // Failed records may retain stale recommendation text from an earlier run.
    // Derive a safe failure message instead of exposing that old explanation.
    reason: completed
      ? profile.recommendationReason
      : profile.recommendationStatus === "FAILED"
        ? getPublicFailureReason(profile)
        : null,
    latencyMs: completed ? profile.recommendationLatencyMs : null,
    version: completed ? profile.recommendationVersion : null,
    atsScore: completed ? profile.atsScore : null,
  };
}
