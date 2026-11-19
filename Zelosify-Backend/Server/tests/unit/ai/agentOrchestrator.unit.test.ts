import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIMessage } from "@langchain/core/messages";
import {
  runRecommendationAgent,
  RecommendationProviderError,
} from "../../../src/services/ai/agentOrchestrator.js";
import type { OpeningCriteria } from "../../../src/services/ai/tools/matchingEngine.js";
import { validateAgentOutput } from "../../../src/services/ai/schemas.js";
import { createPptxFixture } from "../../helpers/pptxFixture.js";

const modelState = vi.hoisted(() => ({
  invoke: vi.fn(),
  extractInvoke: vi.fn(),
  groqConfigs: [] as Array<Record<string, unknown>>,
  googleConfigs: [] as Array<Record<string, unknown>>,
  extractionConfigs: [] as Array<Record<string, unknown>>,
  boundTools: [] as string[][],
}));

vi.mock("@langchain/groq", () => ({
  ChatGroq: class {
    constructor(config: Record<string, unknown>) { modelState.groqConfigs.push(config); }
    bindTools(tools: Array<{ name: string }>) {
      modelState.boundTools.push(tools.map((registered) => registered.name));
      return { invoke: modelState.invoke };
    }
    withStructuredOutput(_schema: unknown, config: Record<string, unknown>) { modelState.extractionConfigs.push(config); return { invoke: modelState.extractInvoke }; }
    invoke = modelState.invoke;
  },
}));

vi.mock("@langchain/google", () => ({
  ChatGoogle: class {
    constructor(config: Record<string, unknown>) { modelState.googleConfigs.push(config); }
    bindTools(tools: Array<{ name: string }>) {
      modelState.boundTools.push(tools.map((registered) => registered.name));
      return { invoke: modelState.invoke };
    }
    withStructuredOutput(_schema: unknown, config: Record<string, unknown>) { modelState.extractionConfigs.push(config); return { invoke: modelState.extractInvoke }; }
    invoke = modelState.invoke;
  },
}));

const opening: OpeningCriteria = {
  experienceMin: 4,
  experienceMax: 8,
  requiredSkills: ["react", "node.js", "typescript"],
  location: "New York, NY",
};

function toolResponse(name: string): AIMessage {
  return new AIMessage({ content: "", tool_calls: [{ id: `call-${name}`, name, args: {} }] });
}

function enqueueSuccessfulRun(explanation: string): void {
  for (const name of ["parse_resume", "extract_features", "normalize_skills", "match_candidate", "score_candidate"]) {
    modelState.invoke.mockResolvedValueOnce(toolResponse(name));
  }
  modelState.invoke.mockResolvedValueOnce(new AIMessage({ content: explanation }));
}

function groqFeatureJsonResponse(): AIMessage {
  return new AIMessage({ content: JSON.stringify({
    candidateName: "Sam Candidate",
    experienceYears: 5,
    skills: ["react", "node.js", "typescript"],
    location: "New York",
    education: [],
    keywords: ["react", "node.js", "typescript"],
  }) });
}

describe("AI Recommendation Agent Orchestrator", () => {
  beforeEach(() => {
    process.env.AI_AGENT_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "unit-test-groq-key";
    // Prevent credentials from a developer's local .env from changing fallback tests.
    process.env.GEMINI_API_KEY = "";
    process.env.GOOGLE_API_KEY = "";
    process.env.GOOGLE_CLOUD_API_KEY = "";
    modelState.invoke.mockReset();
    modelState.extractInvoke.mockReset().mockResolvedValue({
      parsed: {
        candidateName: "Sam Candidate",
        experienceYears: 5,
        skills: ["react", "node.js", "typescript"],
        location: "New York",
        education: [],
        keywords: ["react", "node.js", "typescript"],
      },
      raw: new AIMessage({ content: "", usage_metadata: { input_tokens: 11, output_tokens: 7, total_tokens: 18 } }),
    });
    modelState.groqConfigs.length = 0;
    modelState.googleConfigs.length = 0;
    modelState.extractionConfigs.length = 0;
    modelState.boundTools.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.AI_PROVIDER;
    delete process.env.AI_AGENT_PROVIDER;
    delete process.env.XAI_API_KEY;
    delete process.env.GROK_MODEL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_CLOUD_API_KEY;
    delete process.env.GROQ_API_KEY;
  });

  it("orchestrates LangChain tools and keeps score calculation deterministic", async () => {
    enqueueSuccessfulRun("The candidate matches the required skills and experience. This result is decision support.");
    const buffer = createPptxFixture("Senior Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY.");
    const result = await runRecommendationAgent(buffer, "john_doe_resume.pptx", opening);

    expect(result.recommended).toBe(true);
    expect(result.score).toBeCloseTo(0.9, 12);
    expect(result.atsScore).toBe(90);
    expect(validateAgentOutput({ recommended: result.recommended, score: result.score, confidence: result.confidence, reason: result.reason })).toBe(true);
    expect(result.metadata.provider).toBe("groq-langchain-tool-calling");
    expect(modelState.groqConfigs[0]).toMatchObject({ model: "openai/gpt-oss-120b", maxTokens: 1_500 });
    expect(modelState.extractionConfigs[0]).toMatchObject({ method: "jsonMode", includeRaw: true });
    expect(result.metadata.extractionSource).toBe("langchain-resume-document");
    expect(result.metadata.tokenUsage).toEqual({ promptTokens: 11, completionTokens: 7, totalTokens: 18 });
    expect(modelState.boundTools).toHaveLength(5);
    expect(modelState.boundTools.every((names) => names.join(",") === "parse_resume,extract_features,normalize_skills,match_candidate,score_candidate")).toBe(true);
    expect(modelState.invoke).toHaveBeenCalledTimes(6);
    expect(JSON.stringify(modelState.extractInvoke.mock.calls[0]?.[0])).toContain("Senior Engineer with 5 years experience");
  });

  it("uses the configured Gemini model for the same registered tool-calling flow", async () => {
    process.env.AI_AGENT_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "unit-test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    enqueueSuccessfulRun("The candidate meets the saved opening requirements based on the validated tool results.");

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
    );

    expect(result.metadata.provider).toBe("gemini-langchain-tool-calling");
    expect(modelState.extractionConfigs[0]).toMatchObject({ method: "functionCalling", includeRaw: true });
    expect(result.metadata.model).toBe("gemini-test-model");
    expect(modelState.googleConfigs[0]).toMatchObject({ apiKey: "unit-test-gemini-key", model: "gemini-test-model", reasoningEffort: "minimal", maxOutputTokens: 800 });
    expect(modelState.groqConfigs).toHaveLength(0);
    expect(modelState.boundTools).toHaveLength(5);
  });

  it("retries a Groq rate limit with configured Gemini for the same job-specific analysis", async () => {
    process.env.GEMINI_API_KEY = "unit-test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    const rateLimited = () => Object.assign(new Error("rate limited"), {
      status: 429,
      response: { headers: { "retry-after": "0" } },
    });
    modelState.invoke.mockRejectedValueOnce(rateLimited()).mockRejectedValueOnce(rateLimited());
    enqueueSuccessfulRun("The resume facts match the saved opening requirements based on validated analysis.");

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
      "Sam Candidate",
    );

    expect(result.metadata.provider).toBe("gemini-langchain-tool-calling");
    expect(result.metadata.model).toBe("gemini-test-model");
    expect(modelState.groqConfigs).toHaveLength(2);
    expect(modelState.googleConfigs).toHaveLength(1);
    expect(modelState.boundTools).toHaveLength(7);
  });

  it("fails over immediately from a Groq timeout without repeating the timed-out request", async () => {
    process.env.GEMINI_API_KEY = "unit-test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    const timeout = Object.assign(new Error("provider timed out"), { name: "TimeoutError" });
    modelState.invoke.mockRejectedValueOnce(timeout);
    enqueueSuccessfulRun("Validated resume facts match this opening based on deterministic tool results.");

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
      "Sam Candidate",
    );

    expect(result.metadata.provider).toBe("gemini-langchain-tool-calling");
    expect(modelState.groqConfigs).toHaveLength(1);
    expect(modelState.googleConfigs).toHaveLength(1);
  });

  it("tries Gemini once and returns a safe timeout failure when both providers time out", async () => {
    process.env.GEMINI_API_KEY = "unit-test-gemini-key";
    const groqTimeout = Object.assign(new Error("Groq request timed out"), { name: "TimeoutError" });
    const geminiTimeout = Object.assign(new Error("Gemini request timed out"), { name: "TimeoutError" });
    modelState.invoke.mockRejectedValueOnce(groqTimeout).mockRejectedValueOnce(geminiTimeout);

    await expect(runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
      "Sam Candidate",
    )).rejects.toMatchObject({ errorCode: "PROVIDER_TIMEOUT", provider: "gemini" });

    expect(modelState.groqConfigs).toHaveLength(1);
    expect(modelState.googleConfigs).toHaveLength(1);
  });

  it("fails over to Gemini when Groq repeatedly returns malformed tool output", async () => {
    process.env.GEMINI_API_KEY = "unit-test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    modelState.invoke
      .mockResolvedValueOnce(new AIMessage({ content: "I will analyze the resume." }))
      .mockResolvedValueOnce(new AIMessage({ content: "Still no valid tool call." }))
      .mockResolvedValueOnce(new AIMessage({ content: "No registered tool call was returned." }));
    enqueueSuccessfulRun("Validated resume facts match this opening based on deterministic tool results.");

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
      "Sam Candidate",
    );

    expect(result.metadata.provider).toBe("gemini-langchain-tool-calling");
    expect(modelState.groqConfigs).toHaveLength(1);
    expect(modelState.googleConfigs).toHaveLength(1);
  });

  it("fails over from a Groq structured extraction HTTP 400 to Gemini", async () => {
    process.env.GEMINI_API_KEY = "unit-test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    modelState.invoke
      .mockResolvedValueOnce(toolResponse("parse_resume"))
      .mockResolvedValueOnce(toolResponse("extract_features"))
      .mockResolvedValueOnce(new AIMessage({ content: "The model returned malformed JSON instead of candidate facts." }));
    modelState.extractInvoke.mockRejectedValueOnce(Object.assign(new Error("structured extraction rejected"), { status: 400 }));
    enqueueSuccessfulRun("Validated resume facts match this opening based on deterministic tool results.");

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
      "Sam Candidate",
    );

    expect(result.metadata.provider).toBe("gemini-langchain-tool-calling");
    expect(result.metadata.model).toBe("gemini-test-model");
    expect(modelState.groqConfigs).toHaveLength(1);
    expect(modelState.googleConfigs).toHaveLength(1);
  });

  it("recovers a Groq structured-output HTTP 400 with plain JSON and local schema validation", async () => {
    modelState.invoke
      .mockResolvedValueOnce(toolResponse("parse_resume"))
      .mockResolvedValueOnce(toolResponse("extract_features"))
      .mockResolvedValueOnce(groqFeatureJsonResponse())
      .mockResolvedValueOnce(toolResponse("normalize_skills"))
      .mockResolvedValueOnce(toolResponse("match_candidate"))
      .mockResolvedValueOnce(toolResponse("score_candidate"))
      .mockResolvedValueOnce(new AIMessage({ content: "Validated resume facts match the opening through deterministic tool results." }));
    modelState.extractInvoke.mockRejectedValueOnce(Object.assign(new Error("structured extraction rejected"), { status: 400 }));

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
      "Sam Candidate",
    );

    expect(result.metadata.provider).toBe("groq-langchain-tool-calling");
    expect(modelState.groqConfigs).toHaveLength(1);
    expect(modelState.googleConfigs).toHaveLength(0);
    expect(result.metadata.extractedFeatures.skills).toEqual(["react", "node.js", "typescript"]);
  });

  it("fails over from a Gemini availability error to the configured Groq model", async () => {
    process.env.AI_AGENT_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "unit-test-gemini-key";
    process.env.GROQ_API_KEY = "unit-test-groq-key";
    const unavailable = () => Object.assign(new Error("temporarily unavailable"), {
      status: 503,
      response: { headers: { "retry-after": "0" } },
    });
    modelState.invoke.mockRejectedValueOnce(unavailable()).mockRejectedValueOnce(unavailable());
    enqueueSuccessfulRun("The candidate facts align with the opening after validated tool analysis.");

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with five years of experience and React, Node.js, TypeScript skills."),
      "candidate_resume.pptx",
      opening,
      "Sam Candidate",
    );

    expect(result.metadata.provider).toBe("groq-langchain-tool-calling");
    expect(modelState.googleConfigs).toHaveLength(2);
    expect(modelState.groqConfigs).toHaveLength(1);
  });

  it("rejects screening when the resume name does not match the authenticated candidate profile", async () => {
    enqueueSuccessfulRun("The resume facts match the saved opening requirements based on validated analysis.");
    await expect(runRecommendationAgent(
      createPptxFixture("Resume for a different person with five years of experience."),
      "candidate_resume.pptx",
      opening,
      "Alex Candidate",
    )).rejects.toMatchObject({ errorCode: "RESUME_IDENTITY_MISMATCH" });
  });

  it("lets the model choose from registered tools and recovers once from an invalid dependency order", async () => {
    modelState.invoke.mockResolvedValueOnce(toolResponse("extract_features"));
    enqueueSuccessfulRun("The candidate meets the saved opening requirements based on validated tool results.");
    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with five years experience and React, Node.js, TypeScript skills."),
      "candidate_resume.pptx",
      opening,
    );
    expect(result.metadata.toolExecutions.map(({ name, status }) => `${name}:${status}`)).toEqual([
      "extract_features:FAILED", "parse_resume:COMPLETED", "extract_features:COMPLETED",
      "normalize_skills:COMPLETED", "match_candidate:COMPLETED", "score_candidate:COMPLETED",
    ]);
    expect(modelState.invoke).toHaveBeenCalledTimes(7);
  });

  it("keeps existing xAI Grok compatibility through the LangChain OpenAI-compatible endpoint", async () => {
    process.env.AI_AGENT_PROVIDER = "grok";
    process.env.XAI_API_KEY = "unit-test-xai-key";
    process.env.GROK_MODEL = "grok-test-model";
    enqueueSuccessfulRun("The candidate matches the core requirements based on the validated analysis. This is decision support.");

    const result = await runRecommendationAgent(
      createPptxFixture("Engineer with 5 years experience. React, Node.js, TypeScript. New York, NY."),
      "candidate_resume.pptx",
      opening,
    );

    expect(result.metadata.provider).toBe("xai-grok-langchain-tool-calling");
    expect(modelState.groqConfigs[0]).toMatchObject({ apiKey: "unit-test-xai-key", model: "grok-test-model", baseUrl: "https://api.x.ai/v1" });
    expect(modelState.extractionConfigs[0]).toMatchObject({ method: "functionCalling", includeRaw: true });
  });

  it("reports a safe model-not-found failure without leaking provider response text", async () => {
    modelState.invoke.mockRejectedValueOnce(Object.assign(new Error("private provider response"), { status: 404 }));
    await expect(runRecommendationAgent(createPptxFixture("Candidate resume with sufficient text content."), "candidate_resume.pptx", opening))
      .rejects.toMatchObject<Partial<RecommendationProviderError>>({ errorCode: "PROVIDER_MODEL_NOT_FOUND", provider: "groq", httpStatus: 404 });
  });

  it("preserves provider status when LangChain structured resume extraction fails", async () => {
    modelState.invoke
      .mockResolvedValueOnce(toolResponse("parse_resume"))
      .mockResolvedValueOnce(toolResponse("extract_features"));
    modelState.extractInvoke.mockRejectedValueOnce(Object.assign(new Error("private provider detail"), { status: 404 }));

    await expect(runRecommendationAgent(
      createPptxFixture("Candidate resume with enough readable content for a real parser."),
      "candidate_resume.pptx",
      opening,
    )).rejects.toMatchObject<Partial<RecommendationProviderError>>({
      errorCode: "PROVIDER_MODEL_NOT_FOUND",
      provider: "groq",
      httpStatus: 404,
    });
  });

  it("accurately handles borderline and non-recommended candidates", async () => {
    modelState.extractInvoke.mockResolvedValue({
      parsed: {
        candidateName: "Sam Candidate",
        experienceYears: 2,
        skills: ["react", "python"],
        location: "London",
        education: [],
        keywords: ["react", "python"],
      },
      raw: new AIMessage({ content: "" }),
    });
    enqueueSuccessfulRun("The candidate falls below the score threshold because the saved requirements do not match. This is decision support.");
    const result = await runRecommendationAgent(
      createPptxFixture("Junior Developer with 2 years experience. Skills: React, Python. Location: London."),
      "junior_resume.pptx",
      opening,
    );
    expect(result.recommended).toBe(false);
    expect(result.score).toBeLessThan(0.5);
  });

});
