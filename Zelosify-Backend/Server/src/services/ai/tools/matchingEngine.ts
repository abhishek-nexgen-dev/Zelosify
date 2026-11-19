import { MatchingResult, validateMatchingResult } from "../schemas.js";

export interface OpeningCriteria {
  title?: string | null;
  experienceMin: number;
  experienceMax?: number | null;
  requiredSkills: string[];
  location?: string | null;
}

export interface CandidateFeatures {
  experienceYears: number;
  skills: string[];
  location?: string | null;
}

export function normalizeSkill(skill: string): string {
  const s = skill.trim().toLowerCase();
  const synonyms: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    reactjs: "react",
    "react.js": "react",
    nodejs: "node.js",
    "node js": "node.js",
    py: "python",
    golang: "go",
    postgres: "postgresql",
    k8s: "kubernetes",
    aws: "amazon web services",
    gcp: "google cloud",
  };
  return synonyms[s] || s;
}









export function calculateScores(
  candidate: CandidateFeatures,
  opening: OpeningCriteria
): MatchingResult {

  let experienceMatchScore = 0;
  const min = opening.experienceMin ?? 0;
  const max = opening.experienceMax ?? null;
  const exp = candidate.experienceYears ?? 0;

  if (exp < min) {
    experienceMatchScore = 0;
  } else if (max !== null && max !== undefined) {
    if (exp <= max) {
      experienceMatchScore = 1.0;
    } else {
      experienceMatchScore = 0.8;
    }
  } else {

    experienceMatchScore = 1.0;
  }


  let skillMatchScore = 1.0;
  const normalizedCandidateSkills = new Set(
    (candidate.skills || []).map(normalizeSkill).filter(Boolean)
  );
  const normalizedRequiredSkills = [...new Set((opening.requiredSkills || [])
    .map(normalizeSkill)
    .filter(Boolean))];

  if (normalizedRequiredSkills.length > 0) {
    const overlapCount = normalizedRequiredSkills.filter((reqSkill) =>
      normalizedCandidateSkills.has(reqSkill)
    ).length;
    skillMatchScore = overlapCount / normalizedRequiredSkills.length;
  } else {
    skillMatchScore = 1.0;
  }


  let locationMatchScore = 0.5;
  const openingLoc = (opening.location || "").trim().toLowerCase();
  const candidateLoc = (candidate.location || "").trim().toLowerCase();

  const isRemoteOpening = openingLoc.includes("remote") || !openingLoc;
  const isCandidateRemote = candidateLoc.includes("remote");

  if (isRemoteOpening || isCandidateRemote) {
    locationMatchScore = 1.0;
  } else if (
    openingLoc &&
    candidateLoc &&
    openingLoc === candidateLoc
  ) {
    locationMatchScore = 1.0;
  } else {
    locationMatchScore = 0.5;
  }


  const rawFinalScore =
    0.5 * skillMatchScore + 0.3 * experienceMatchScore + 0.2 * locationMatchScore;
  const finalScore = rawFinalScore;

  const result: MatchingResult = {
    skillMatchScore: skillMatchScore,
    experienceMatchScore: experienceMatchScore,
    locationMatchScore: locationMatchScore,
    finalScore,
  };

  const valid = validateMatchingResult(result);
  if (!valid) {
    throw new Error(
      `Matching result schema validation failed: ${JSON.stringify(validateMatchingResult.errors)}`
    );
  }

  return result;
}

export function getRecommendationDecision(score: number): {
  recommended: boolean;
  label: "Recommended" | "Borderline" | "Not Recommended";
} {
  if (score >= 0.75) {
    return { recommended: true, label: "Recommended" };
  } else if (score >= 0.5) {
    return { recommended: false, label: "Borderline" };
  } else {
    return { recommended: false, label: "Not Recommended" };
  }
}
