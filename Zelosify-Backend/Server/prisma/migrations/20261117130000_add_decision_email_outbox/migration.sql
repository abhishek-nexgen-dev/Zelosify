CREATE TYPE "DecisionEmailStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'SKIPPED', 'FAILED');

CREATE TABLE "decisionEmailOutbox" (
    "id" TEXT NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "decision" "ProfileStatus" NOT NULL,
    "status" "DecisionEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisionEmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "decisionEmailOutbox_applicationId_decision_key"
ON "decisionEmailOutbox"("applicationId", "decision");

CREATE INDEX "decisionEmailOutbox_status_nextAttemptAt_idx"
ON "decisionEmailOutbox"("status", "nextAttemptAt");

CREATE INDEX "decisionEmailOutbox_lockedUntil_idx"
ON "decisionEmailOutbox"("lockedUntil");
