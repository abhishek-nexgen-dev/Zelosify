import Ajv, { type JSONSchemaType } from "ajv";

const ajv = new Ajv({ allErrors: true, coerceTypes: false });

export interface ExtractedFeatures {
  experienceYears: number;
  skills: string[];
  normalizedSkills: string[];
  location: string;
  education: string[];
  keywords: string[];
}

export interface MatchingResult {
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
  finalScore: number;
}

export interface AgentRecommendationOutput {
  recommended: boolean;
  score: number;
  confidence: number;
  reason: string;
}

const extractedFeaturesSchema: JSONSchemaType<ExtractedFeatures> = {
  type: "object",
  properties: {
    experienceYears: { type: "number", minimum: 0, maximum: 100 },
    skills: { type: "array", maxItems: 500, items: { type: "string", maxLength: 200 } },
    normalizedSkills: { type: "array", maxItems: 500, items: { type: "string", maxLength: 200 } },
    location: { type: "string", maxLength: 500 },
    education: { type: "array", maxItems: 500, items: { type: "string", maxLength: 200 } },
    keywords: { type: "array", maxItems: 500, items: { type: "string", maxLength: 200 } },
  },
  required: ["experienceYears", "skills", "normalizedSkills", "location", "education", "keywords"],
  additionalProperties: false,
};

const matchingResultSchema: JSONSchemaType<MatchingResult> = {
  type: "object",
  properties: {
    skillMatchScore: { type: "number", minimum: 0, maximum: 1 },
    experienceMatchScore: { type: "number", minimum: 0, maximum: 1 },
    locationMatchScore: { type: "number", minimum: 0, maximum: 1 },
    finalScore: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["skillMatchScore", "experienceMatchScore", "locationMatchScore", "finalScore"],
  additionalProperties: false,
};

const agentOutputSchema: JSONSchemaType<AgentRecommendationOutput> = {
  type: "object",
  properties: {
    recommended: { type: "boolean" },
    score: { type: "number", minimum: 0, maximum: 1 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string", minLength: 20, maxLength: 2000 },
  },
  required: ["recommended", "score", "confidence", "reason"],
  additionalProperties: false,
};

export const validateExtractedFeatures = ajv.compile(extractedFeaturesSchema);
export const validateMatchingResult = ajv.compile(matchingResultSchema);
export const validateAgentOutput = ajv.compile(agentOutputSchema);
