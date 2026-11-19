ALTER TABLE "Opening"
ADD COLUMN "recruiterId" TEXT;

CREATE INDEX "Opening_recruiterId_idx" ON "Opening"("recruiterId");
