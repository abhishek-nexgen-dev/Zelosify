import { describe, it, expect } from "vitest";
import { envSchema, validateEnv, ENV } from "../../../src/constants/env.js";

describe("Environment Variables Zod Validation (ENV)", () => {
  it("exports a validated ENV constant with defaults", () => {
    expect(ENV).toBeDefined();
    expect(typeof ENV.PORT).toBe("number");
    expect(ENV.PORT).toBe(5000);
    expect(ENV.NODE_ENV).toBe("test");
    expect(ENV.DEFAULT_TENANT_ID).toBe("8dc0e05b-2956-4d74-b0e9-5aea5ab3b748");
    expect(ENV.GEMINI_REQUEST_TIMEOUT_MS).toBe(15000);
  });

  it("coerces string numbers into actual numbers", () => {
    const parsed = envSchema.parse({
      ...process.env,
      PORT: "8000",
      STORAGE_SIGNED_URL_EXPIRES_IN: "1200",
      DEFAULT_PAGE_LIMIT: "25",
    });

    expect(parsed.PORT).toBe(8000);
    expect(parsed.STORAGE_SIGNED_URL_EXPIRES_IN).toBe(1200);
    expect(parsed.DEFAULT_PAGE_LIMIT).toBe(25);
  });

  it("validates allowed storage provider enums", () => {
    const awsParsed = envSchema.parse({ ...process.env, STORAGE_PROVIDER: "aws" });
    expect(awsParsed.STORAGE_PROVIDER).toBe("aws");

    const gcpParsed = envSchema.parse({ ...process.env, STORAGE_PROVIDER: "google" });
    expect(gcpParsed.STORAGE_PROVIDER).toBe("google");

    expect(() => envSchema.parse({ ...process.env, STORAGE_PROVIDER: "unsupported-provider" })).toThrow();
  });

  it("validates allowed NODE_ENV enums", () => {
    expect(envSchema.parse({ ...process.env, NODE_ENV: "production" }).NODE_ENV).toBe("production");
    expect(envSchema.parse({ ...process.env, NODE_ENV: "development" }).NODE_ENV).toBe("development");
    expect(envSchema.parse({ ...process.env, NODE_ENV: "test" }).NODE_ENV).toBe("test");

    expect(() => envSchema.parse({ ...process.env, NODE_ENV: "invalid-env" })).toThrow();
  });

  it("validates successfully with validateEnv function", () => {
    const validated = validateEnv({
      ...process.env,
      PORT: "5050",
      NODE_ENV: "development",
      DEFAULT_TENANT_ID: "8dc0e05b-2956-4d74-b0e9-5aea5ab3b748",
    });

    expect(validated.PORT).toBe(5050);
    expect(validated.DEFAULT_TENANT_ID).toBe("8dc0e05b-2956-4d74-b0e9-5aea5ab3b748");
  });
});
