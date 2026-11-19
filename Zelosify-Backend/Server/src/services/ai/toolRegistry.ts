import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ResumeBufferDocumentLoader } from "./tools/resumeParser.js";
import { calculateScores, normalizeSkill, type OpeningCriteria } from "./tools/matchingEngine.js";
import { validateExtractedFeatures, validateMatchingResult, type ExtractedFeatures, type MatchingResult } from "./schemas.js";

const toolNames = ["parse_resume", "extract_features", "normalize_skills", "match_candidate", "score_candidate"] as const;
export type RecommendationToolName = typeof toolNames[number];
export const recommendationToolDefinitions = toolNames.map((name) => ({
  type: "function",
  function: {
    name,
    description: {
      parse_resume: "Parse the authorized PDF, DOC, DOCX, or PPTX resume. Must run before extract_features.",
      extract_features: "Extract structured candidate facts from parsed resume. Must run before normalize_skills.",
      normalize_skills: "Normalize and deduplicate extracted and required skills. Must run before match_candidate.",
      match_candidate: "Match normalized candidate features against saved opening requirements. Must run before score_candidate.",
      score_candidate: "Compute validated deterministic weighted scores. Required before final explanation.",
    }[name],
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
}));

export interface ToolExecution { name: string; durationMs: number; status: "COMPLETED" | "FAILED" }
export interface RecommendationToolState {
  features?: ExtractedFeatures;
  matching?: MatchingResult;
  executions: ToolExecution[];
}
export type ResumeBufferSource = Buffer | (() => Promise<Buffer>);
export class RecommendationToolExecutionError extends Error {
  constructor(readonly errorCode: string) {
    super("Recommendation tool execution failed");
    this.name = "RecommendationToolExecutionError";
  }
}
const emptyArguments = z.object({}).strict();
const textSchema = z.string().min(20).max(20_000);
const comparisonSchema = z.object({
  requiredSkills: z.array(z.string().min(1).max(200)).max(500),
  matchedSkills: z.array(z.string().min(1).max(200)).max(500),
  experienceYears: z.number().min(0).max(100),
  location: z.string().max(500),
}).strict();

// The model can select tools, but cannot supply object keys, user IDs, scores or invented features.
export function createRecommendationTools(resumeSource: ResumeBufferSource, filename: string, opening: OpeningCriteria, extract: (text: string) => Promise<ExtractedFeatures>) {
  const state: RecommendationToolState = { executions: [] };
  const completed = new Set<string>();
  let text = "";
  let normalizedOpening = opening;
  const execute = async (name: string, rawArguments: string): Promise<unknown> => {
      const started = Date.now();
      try {
        emptyArguments.parse(JSON.parse(rawArguments));
        const index = toolNames.findIndex((allowed) => allowed === name);
        if (index < 0 || completed.has(name)) throw new Error("Unknown or repeated tool");
        if (index > 0 && !completed.has(toolNames[index - 1])) throw new Error("Required prerequisite tool has not completed");
        let output: unknown;
        switch (name) {
          case "parse_resume": {
            if (!/\.(pdf|doc|docx|pptx)$/i.test(filename)) throw new Error("Unsupported resume");
            const buffer = typeof resumeSource === "function" ? await resumeSource() : resumeSource;
            if (!Buffer.isBuffer(buffer) || buffer.length > 10 * 1024 * 1024) throw new Error("Unsupported resume");
            const documents = await new ResumeBufferDocumentLoader(buffer, filename).load();
            text = textSchema.parse(documents.map((document) => document.pageContent).join("\n"));
            output = z.object({ readableCharacters: z.number().int().min(20).max(20_000) }).strict().parse({ readableCharacters: text.length });
            break;
          }
          case "extract_features": {
            const features = await extract(text);
            if (!validateExtractedFeatures(features)) throw new Error("Invalid extracted features");
            state.features = features;
            output = features;
            break;
          }
          case "normalize_skills": {
            if (!state.features) throw new Error("Missing features");
            const skills = [...new Set(state.features.skills.map(normalizeSkill).filter(Boolean))];
            state.features = { ...state.features, skills, normalizedSkills: skills };
            normalizedOpening = { ...opening, requiredSkills: [...new Set(opening.requiredSkills.map(normalizeSkill).filter(Boolean))] };
            if (!validateExtractedFeatures(state.features)) throw new Error("Invalid normalized features");
            output = state.features;
            break;
          }
          case "match_candidate": {
            if (!state.features) throw new Error("Missing features");
            output = comparisonSchema.parse({ requiredSkills: normalizedOpening.requiredSkills, matchedSkills: normalizedOpening.requiredSkills.filter((skill) => state.features?.normalizedSkills.includes(skill)), experienceYears: state.features.experienceYears, location: state.features.location });
            break;
          }
          case "score_candidate": {
            if (!state.features) throw new Error("Missing features");
            const scores = calculateScores(state.features, normalizedOpening);
            if (!validateMatchingResult(scores)) throw new Error("Invalid deterministic scores");
            state.matching = scores;
            output = scores;
            break;
          }
          default: throw new Error("Unregistered recommendation tool");
        }
        completed.add(name);
        state.executions.push({ name, durationMs: Date.now() - started, status: "COMPLETED" });
        return output;
      } catch (error) {
        if (error instanceof Error && error.name === "RecommendationProviderError") throw error;
        state.executions.push({ name: toolNames.includes(name as RecommendationToolName) ? name : "unknown", durationMs: Date.now() - started, status: "FAILED" });
        const orderViolation = error instanceof Error && /unknown or repeated tool|required prerequisite/i.test(error.message);
        const invalidInput = error instanceof SyntaxError || error instanceof z.ZodError;
        const errorCode = orderViolation ? "TOOL_ORDER_INVALID"
          : invalidInput ? "TOOL_ARGUMENTS_INVALID"
          : name === "parse_resume" ? "RESUME_PARSE_FAILED"
            : name === "extract_features" ? "FEATURE_EXTRACTION_FAILED"
              : "TOOL_EXECUTION_FAILED";
        throw new RecommendationToolExecutionError(errorCode);
      }
    };
  const registeredTools = toolNames.map((name) => tool(
    async (input) => {
      const args = typeof input === "object" && input !== null && "args" in input ? input.args : input;
      return JSON.stringify(await execute(name, JSON.stringify(args)));
    },
    {
      name,
      description: recommendationToolDefinitions.find((definition) => definition.function.name === name)?.function.description ?? "Registered resume analysis step",
      schema: emptyArguments,
    },
  ));
  return {
    state,
    getNextToolName: () => toolNames.find((name) => !completed.has(name)),
    registeredTools,
    execute,
  };
}
