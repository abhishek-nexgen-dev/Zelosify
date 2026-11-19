ALTER TABLE "hiringProfile"
ADD COLUMN "recommendationRunId" TEXT,
ADD COLUMN "recommendationStartedAt" TIMESTAMP(3),
ADD COLUMN "recommendationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recommendationMetadata" JSONB;

CREATE INDEX "hiringProfile_recommendationStatus_recommendationStartedAt_idx"
ON "hiringProfile"("recommendationStatus", "recommendationStartedAt");
