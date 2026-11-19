CREATE TABLE "storageDeletion" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "bucketName" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storageDeletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storageDeletion_objectKey_key" ON "storageDeletion"("objectKey");
CREATE INDEX "storageDeletion_nextAttemptAt_idx" ON "storageDeletion"("nextAttemptAt");
