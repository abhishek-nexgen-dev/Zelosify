import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const envSchema = z.object({
  // Server Configuration
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),
  SESSION_SECRET: z.string().min(32),

  // Database Connection
  DATABASE_URL: z.string().url(),

  // JWT & Security
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_ALGORITHM: z.string().default("aes-256-gcm"),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hexadecimal characters"),

  // Storage Configuration
  STORAGE_PROVIDER: z.enum(["aws", "google", "local"]).default("aws"),
  S3_AWS_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  S3_BUCKET_NAME: z.string().default("zel-recruit"),
  S3_ENDPOINT: z.string().optional(),
  STORAGE_SIGNED_URL_EXPIRES_IN: z.coerce.number().default(900),
  S3_PRESIGNED_URL_EXPIRES_IN: z.coerce.number().default(900),

  GCS_BUCKET_NAME: z.string().optional().default("zelosify-recruit-bucket"),
  GOOGLE_CLOUD_BUCKET: z.string().optional(),
  GCP_STORAGE_BUCKET: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional().default("zelosify-dev"),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GCP_KEY_FILE: z.string().optional(),
  GCP_CLIENT_EMAIL: z.string().optional(),
  GCP_PRIVATE_KEY: z.string().optional(),
  GCS_SIGNED_URL_EXPIRES_IN: z.coerce.number().default(3600),

  // Keycloak Identity & Access Management
  KEYCLOAK_URL: z.string().default("http://localhost:8080/auth"),
  KEYCLOAK_REALM: z.string().default("Zelosify"),
  KEYCLOAK_CLIENT_ID: z.string().default("dynamic-client"),
  KEYCLOAK_CLIENT_SECRET: z.string().optional().default(""),
  KEYCLOAK_ADMIN: z.string().default("admin"),
  KEYCLOAK_ADMIN_PASSWORD: z.string().optional().default(''),
  KEYCLOAK_ADMIN_USERNAME: z.string().default("admin"),
  KEYCLOAK_RS256_SIG: z.string().optional(),

  // Single Tenant & Default Admin Auto-Provisioning
  DEFAULT_TENANT_ID: z.string().default("8dc0e05b-2956-4d74-b0e9-5aea5ab3b748"),
  TENANT_ID: z.string().optional(),
  DEFAULT_TENANT_NAME: z.string().default("Bruce Wayne Corp"),
  DEFAULT_HIRING_MANAGER_NAME: z.string().default("Bruce Wayne"),
  DEFAULT_ADMIN_USERNAME: z.string().default("admin"),
  DEFAULT_ADMIN_EMAIL: z.string().default("admin@zelosify.com"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(12),
  DEFAULT_ADMIN_FIRST_NAME: z.string().default("System"),
  DEFAULT_ADMIN_LAST_NAME: z.string().default("Admin"),

  // AI & Screening Services
  AI_PROVIDER: z.string().default("google"), // Deprecated; AI_AGENT_PROVIDER now selects the LangChain model for extraction and tool calling.
  AI_AGENT_PROVIDER: z.enum(["groq", "gemini", "grok", "xai"]).default("groq"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GOOGLE_API_KEY: z.string().optional().default(""),
  GOOGLE_CLOUD_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.1-flash-lite"),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  GEMINI_REQUEST_TIMEOUT_MS: z.coerce.number().default(15000),
  XAI_API_KEY: z.string().optional().default(""),
  GROK_MODEL: z.string().default("grok-4.3"),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(15000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().default(150),
  AI_TEMPERATURE: z.coerce.number().default(0.2),

  // SMTP notifications for candidate decisions; leave SMTP_HOST empty to disable sending.
  SMTP_HOST: z.string().trim().optional().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_FROM: z.string().trim().optional().default(""),
  DECISION_EMAIL_WORKER_INTERVAL_MS: z.coerce.number().int().min(1000).max(300000).default(10000),

  // Auth Lifespans & Cache
  ACCESS_TOKEN_MAX_AGE_MS: z.coerce.number().default(14400000),
  REFRESH_TOKEN_MAX_AGE_MS: z.coerce.number().default(86400000),
  USER_CACHE_TTL_MS: z.coerce.number().default(300000),
  DEFAULT_PAGE_LIMIT: z.coerce.number().default(10),
  MAX_PAGE_LIMIT: z.coerce.number().default(100),
  UPLOAD_TOKEN_EXPIRY_MS: z.coerce.number().default(300000),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(100 * 1024 * 1024),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates raw environment object against envSchema.
 * Throws diagnostic error if invalid.
 */
export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`❌ [EnvValidator] Invalid Environment Variables (.env):\n${errorDetails}`);
    throw new Error(`Invalid Environment Variables:\n${errorDetails}`);
  }
  return result.data;
}

// Initial parse & validation of process.env
const validatedEnv = validateEnv(process.env);

/**
 * Validated ENV constant.
 * Uses a Proxy to transparently support live dynamic overrides (e.g. in test suites with vi.stubEnv).
 */
export const ENV: EnvConfig = new Proxy(validatedEnv, {
  get(target, prop: string | symbol) {
    if (typeof prop === "string" && prop in process.env) {
      const liveVal = process.env[prop];
      if (liveVal !== undefined) {
        const targetVal = Reflect.get(target, prop);
        if (typeof targetVal === "number") {
          const num = Number(liveVal);
          return isNaN(num) ? targetVal : num;
        }
        if (typeof targetVal === "boolean") {
          return liveVal === "true" || liveVal === "1";
        }
        return liveVal as any;
      }
    }
    return Reflect.get(target, prop);
  },
});

export default ENV;
