import prisma from "../../config/prisma/prisma.js";
import { ENV } from "../../constants/env.js";

export let isDbConnected = false;

function maskDatabaseUrl(url?: string): string {
  if (!url) return "not configured";
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/[^:]+:([^@]+)@/, "://***:****@");
  }
}

export default async function connectPrisma(): Promise<void> {
  const dbUrl = ENV.DATABASE_URL;
  const maskedUrl = maskDatabaseUrl(dbUrl);

  try {
    await prisma.$connect();
    const [schema] = await prisma.$queryRaw<Array<{
      schema: string | null;
      tenants: boolean;
      users: boolean;
      openings: boolean;
      profiles: boolean;
      migrations: boolean;
      recommendationColumns: boolean;
    }>>`
      SELECT
        current_schema() AS "schema",
        to_regclass('"Tenants"') IS NOT NULL AS tenants,
        to_regclass('"User"') IS NOT NULL AS users,
        to_regclass('"Opening"') IS NOT NULL AS openings,
        to_regclass('"hiringProfile"') IS NOT NULL AS profiles,
        to_regclass('"_prisma_migrations"') IS NOT NULL AS migrations,
        (
          SELECT count(*) = 4
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'hiringProfile'
            AND column_name IN (
              'recommendationRunId',
              'recommendationStartedAt',
              'recommendationAttempts',
              'recommendationMetadata'
            )
        ) AS "recommendationColumns"
    `;

    if (!schema) {
      throw new Error("PostgreSQL schema readiness check returned no result.");
    }

    const missing = [
      ["Tenants", schema.tenants],
      ["User", schema.users],
      ["Opening", schema.openings],
      ["hiringProfile", schema.profiles],
      ["_prisma_migrations", schema.migrations],
      ["recommendation execution columns", schema.recommendationColumns],
    ].filter(([, exists]) => !exists).map(([name]) => name);

    if (!schema.schema || missing.length > 0) {
      throw new Error(
        `Prisma schema is not ready in the connected database${schema.schema ? ` (schema "${schema.schema}")` : ""}; missing: ${missing.join(", ") || "active schema"}. Run "npm run prisma:deploy" from Zelosify-Backend/Server.`
      );
    }

    isDbConnected = true;
    console.log(`✅ [PostgreSQL] Connected successfully to database (${maskedUrl})`);
  } catch (error: unknown) {
    isDbConnected = false;
    const details = error instanceof Error ? error.message : String(error);
    const safeDetails = details.replace(/(postgres(?:ql)?:\/\/)[^@/\s]+@/gi, "$1[redacted]@");
    console.error(JSON.stringify({
      level: "error",
      event: "POSTGRES_STARTUP_CHECK_FAILED",
      target: maskedUrl,
      error: safeDetails,
    }));
    throw error;
  }
}
