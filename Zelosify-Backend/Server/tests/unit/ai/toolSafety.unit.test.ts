import { describe, expect, it } from "vitest";
import { createRecommendationTools, RecommendationToolExecutionError } from "../../../src/services/ai/toolRegistry.js";
import { validateAgentOutput, validateExtractedFeatures } from "../../../src/services/ai/schemas.js";
import { createPptxFixture } from "../../helpers/pptxFixture.js";
const opening = { experienceMin: 1, requiredSkills: ["js", "javascript", "python"], location: "Remote" };
const features = { experienceYears: 3, skills: ["JS"], normalizedSkills: ["javascript"], location: "Remote", education: [], keywords: [] };
describe("Recommendation tool safety", () => {
  it("rejects invented scores, unknown tools, and missing prerequisite calls", async () => {
    const tools = createRecommendationTools(createPptxFixture("Candidate has 3 years experience with JavaScript."), "resume.pptx", opening, async () => features);
    await expect(tools.execute("score_candidate", "{}")).rejects.toThrow();
    await expect(tools.execute("parse_resume", '{"score":1}')).rejects.toThrow();
    await expect(tools.execute("database_query", "{}")).rejects.toThrow();
  });
  it("runs all five tools and computes only from validated server context", async () => {
    const tools = createRecommendationTools(createPptxFixture("Candidate has 3 years experience with JavaScript."), "resume.pptx", opening, async () => features);
    for (const name of ["parse_resume", "extract_features", "normalize_skills", "match_candidate", "score_candidate"]) await tools.execute(name, "{}");
    expect(tools.state.matching?.finalScore).toBe(0.75);
    expect(tools.state.executions).toHaveLength(5);
    await expect(tools.execute("score_candidate", "{}")).rejects.toThrow();
  });
  it("retrieves an authorized resume only when the agent invokes the parse tool", async () => {
    let retrievalCount = 0;
    const buffer = createPptxFixture("Candidate has 3 years experience with JavaScript.");
    const tools = createRecommendationTools(async () => {
      retrievalCount += 1;
      return buffer;
    }, "resume.pptx", opening, async () => features);

    expect(retrievalCount).toBe(0);
    await tools.execute("parse_resume", "{}");
    expect(retrievalCount).toBe(1);
    expect(tools.state.executions).toEqual([{ name: "parse_resume", durationMs: expect.any(Number), status: "COMPLETED" }]);
  });
  it("rejects malformed documents rather than fabricating features", async () => {
    const tools = createRecommendationTools(Buffer.from("not a presentation"), "resume.pptx", opening, async () => features);
    await expect(tools.execute("parse_resume", "{}")).rejects.toMatchObject<Partial<RecommendationToolExecutionError>>({ errorCode: "RESUME_PARSE_FAILED" });
    expect(tools.state.features).toBeUndefined();
  });
  it("registers exactly the allowed LangChain tools in dependency order", () => {
    const tools = createRecommendationTools(createPptxFixture("Candidate has 3 years experience with JavaScript."), "resume.pptx", opening, async () => features);
    expect(tools.registeredTools.map(({ name }) => name)).toEqual([
      "parse_resume", "extract_features", "normalize_skills", "match_candidate", "score_candidate",
    ]);
    expect(tools.getNextToolName()).toBe("parse_resume");
  });
  it("does not coerce invalid provider types or accept out-of-range values", () => {
    expect(validateExtractedFeatures({ ...features, experienceYears: "3" })).toBe(false);
    expect(validateExtractedFeatures({ ...features, experienceYears: -1 })).toBe(false);
    expect(validateAgentOutput({ recommended: true, score: 1.2, confidence: 0.8, reason: "A sufficiently long explanation" })).toBe(false);
  });
});
