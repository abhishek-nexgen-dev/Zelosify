import { describe, it, expect } from "vitest";
import {
  calculateScores,
  getRecommendationDecision,
  normalizeSkill,
  type OpeningCriteria,
  type CandidateFeatures,
} from "../../../src/services/ai/tools/matchingEngine.js";

describe("Matching & Scoring Engine (Deterministic Tool)", () => {
  const baseOpening: OpeningCriteria = {
    experienceMin: 3,
    experienceMax: 6,
    requiredSkills: ["react", "node.js", "typescript"],
    location: "New York, NY",
  };

  describe("Experience Match Logic", () => {
    it("returns 0 if candidate experience is below minimum", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 2,
        skills: ["react", "node.js", "typescript"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.experienceMatchScore).toBe(0);
    });

    it("returns 1.0 if candidate experience is exactly at minimum", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 3,
        skills: ["react", "node.js", "typescript"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.experienceMatchScore).toBe(1.0);
    });

    it("returns 1.0 if candidate experience is within range [min, max]", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 5,
        skills: ["react", "node.js", "typescript"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.experienceMatchScore).toBe(1.0);
    });

    it("returns 1.0 if candidate experience is exactly at maximum", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 6,
        skills: ["react", "node.js", "typescript"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.experienceMatchScore).toBe(1.0);
    });

    it("returns 0.8 if candidate experience is above maximum", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 8,
        skills: ["react", "node.js", "typescript"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.experienceMatchScore).toBe(0.8);
    });

    it("handles absent maximum experience properly (returns 1.0 when >= min)", () => {
      const noMaxOpening: OpeningCriteria = {
        experienceMin: 5,
        experienceMax: null,
        requiredSkills: ["react"],
        location: "Remote",
      };
      const candidate: CandidateFeatures = {
        experienceYears: 10,
        skills: ["react"],
        location: "Remote",
      };
      const res = calculateScores(candidate, noMaxOpening);
      expect(res.experienceMatchScore).toBe(1.0);
    });
  });

  describe("Skill Match Logic", () => {
    it("returns 1.0 when candidate has all required skills", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 4,
        skills: ["react", "node.js", "typescript"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.skillMatchScore).toBe(1.0);
    });

    it("calculates exact fraction overlap for partial skills (e.g. 2/3 = 0.667)", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 4,
        skills: ["react", "typescript"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.skillMatchScore).toBeCloseTo(2 / 3, 12);
    });

    it("returns 0 when no required skills overlap", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 4,
        skills: ["python", "django"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.skillMatchScore).toBe(0);
    });

    it("handles skill synonyms and normalization (e.g. js -> javascript, reactjs -> react)", () => {
      const opening: OpeningCriteria = {
        experienceMin: 2,
        requiredSkills: ["javascript", "react"],
      };
      const candidate: CandidateFeatures = {
        experienceYears: 3,
        skills: ["js", "react.js"],
      };
      const res = calculateScores(candidate, opening);
      expect(res.skillMatchScore).toBe(1.0);
    });

    it("handles zero required skills gracefully (returns 1.0)", () => {
      const opening: OpeningCriteria = {
        experienceMin: 2,
        requiredSkills: [],
      };
      const candidate: CandidateFeatures = {
        experienceYears: 3,
        skills: ["python"],
      };
      const res = calculateScores(candidate, opening);
      expect(res.skillMatchScore).toBe(1.0);
    });
  });

  describe("Location Match Logic", () => {
    it("returns 1.0 for exact location match", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 4,
        skills: ["react"],
        location: "New York, NY",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.locationMatchScore).toBe(1.0);
    });

    it("returns 1.0 when opening is Remote", () => {
      const remoteOpening: OpeningCriteria = {
        experienceMin: 2,
        requiredSkills: ["react"],
        location: "Remote",
      };
      const candidate: CandidateFeatures = {
        experienceYears: 4,
        skills: ["react"],
        location: "Austin, TX",
      };
      const res = calculateScores(candidate, remoteOpening);
      expect(res.locationMatchScore).toBe(1.0);
    });

    it("returns 1.0 when candidate location is Remote", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 4,
        skills: ["react"],
        location: "Remote",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.locationMatchScore).toBe(1.0);
    });

    it("returns 0.5 for onsite mismatch", () => {
      const candidate: CandidateFeatures = {
        experienceYears: 4,
        skills: ["react"],
        location: "London, UK",
      };
      const res = calculateScores(candidate, baseOpening);
      expect(res.locationMatchScore).toBe(0.5);
    });
  });

  describe("Mandatory Final Score Formula", () => {
    it("strictly computes FinalScore = 0.5 * skill + 0.3 * exp + 0.2 * loc", () => {

      const perfectCandidate: CandidateFeatures = {
        experienceYears: 5,
        skills: ["react", "node.js", "typescript"],
        location: "New York, NY",
      };
      const res1 = calculateScores(perfectCandidate, baseOpening);
      expect(res1.finalScore).toBe(1.0);



      const partialCandidate: CandidateFeatures = {
        experienceYears: 5,
        skills: ["react", "node.js"],
        location: "San Francisco, CA",
      };
      const res2 = calculateScores(partialCandidate, baseOpening);
      expect(res2.finalScore).toBeCloseTo(0.5 * (2 / 3) + 0.3 + 0.1, 12);
    });
  });

  describe("Decision Thresholds", () => {
    it("marks score >= 0.75 as Recommended", () => {
      expect(getRecommendationDecision(0.75)).toEqual({ recommended: true, label: "Recommended" });
      expect(getRecommendationDecision(0.85)).toEqual({ recommended: true, label: "Recommended" });
      expect(getRecommendationDecision(1.0)).toEqual({ recommended: true, label: "Recommended" });
    });

    it("marks 0.50 <= score < 0.75 as Borderline", () => {
      expect(getRecommendationDecision(0.50)).toEqual({ recommended: false, label: "Borderline" });
      expect(getRecommendationDecision(0.65)).toEqual({ recommended: false, label: "Borderline" });
      expect(getRecommendationDecision(0.749)).toEqual({ recommended: false, label: "Borderline" });
    });

    it("marks score < 0.50 as Not Recommended", () => {
      expect(getRecommendationDecision(0.49)).toEqual({ recommended: false, label: "Not Recommended" });
      expect(getRecommendationDecision(0.20)).toEqual({ recommended: false, label: "Not Recommended" });
      expect(getRecommendationDecision(0.0)).toEqual({ recommended: false, label: "Not Recommended" });
    });
  });
});

describe("Scoring audit regressions", () => {
  it("deduplicates required skill aliases before computing overlap", () => {
    const score = calculateScores({ experienceYears: 3, skills: ["js"], location: "Remote" }, { experienceMin: 1, requiredSkills: ["JS", "javascript", "python"], location: "Remote" });
    expect(score.skillMatchScore).toBe(0.5);
    expect(score.finalScore).toBe(0.75);
  });
  it("does not equate a city substring with an exact location", () => {
    expect(calculateScores({ experienceYears: 3, skills: [], location: "York" }, { experienceMin: 1, requiredSkills: [], location: "New York" }).locationMatchScore).toBe(0.5);
  });
  it("does not round a sub-threshold score up into Recommended", () => {
    const skills = Array.from({ length: 1001 }, (_, i) => `skill${i}`);
    const score = calculateScores({ experienceYears: 2, skills: skills.slice(0, 500), location: "Remote" }, { experienceMin: 1, requiredSkills: skills, location: "Remote" });
    expect(score.finalScore).toBeLessThan(0.75);
    expect(getRecommendationDecision(score.finalScore).label).toBe("Borderline");
  });
});
