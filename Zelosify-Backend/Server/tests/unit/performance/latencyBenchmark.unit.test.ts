import { describe, expect, it } from "vitest";
import { calculateScores, type CandidateFeatures, type OpeningCriteria } from "../../../src/services/ai/tools/matchingEngine.js";

describe("Matching engine batch smoke check", () => {
  const opening: OpeningCriteria = {
    experienceMin: 3,
    experienceMax: 7,
    requiredSkills: ["react", "node.js", "typescript", "postgresql", "aws"],
    location: "New York, NY",
  };
  const candidates: CandidateFeatures[] = [
    { experienceYears: 5, skills: ["react", "node.js", "typescript", "postgresql", "aws"], location: "New York, NY" },
    { experienceYears: 2, skills: ["python", "django", "docker"], location: "Austin, TX" },
    { experienceYears: 8, skills: ["react", "typescript", "kubernetes", "go"], location: "Remote" },
    { experienceYears: 4, skills: ["react", "html", "css", "javascript"], location: "New York, NY" },
    { experienceYears: 6, skills: ["aws", "docker", "terraform", "node.js"], location: "San Francisco, CA" },
  ];

  it("computes finite deterministic scores for 100 in-memory feature records", () => {
    const results = Array.from({ length: 100 }, (_, index) => calculateScores(candidates[index % candidates.length], opening));
    expect(results).toHaveLength(100);
    expect(results.every((result) => Number.isFinite(result.finalScore) && result.finalScore >= 0 && result.finalScore <= 1)).toBe(true);
  });
});
