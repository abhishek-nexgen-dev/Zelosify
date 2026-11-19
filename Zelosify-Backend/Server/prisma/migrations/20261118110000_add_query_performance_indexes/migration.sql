CREATE INDEX "User_tenantId_role_createdAt_idx"
  ON "User"("tenantId", "role", "createdAt" DESC);

CREATE INDEX "Opening_tenantId_recruiterId_idx"
  ON "Opening"("tenantId", "recruiterId");
CREATE INDEX "Opening_status_postedDate_idx"
  ON "Opening"("status", "postedDate" DESC);
CREATE INDEX "Opening_tenantId_postedDate_idx"
  ON "Opening"("tenantId", "postedDate" DESC);
CREATE INDEX "Opening_tenantId_status_postedDate_idx"
  ON "Opening"("tenantId", "status", "postedDate" DESC);
CREATE INDEX "Opening_tenantId_hiringManagerId_postedDate_idx"
  ON "Opening"("tenantId", "hiringManagerId", "postedDate" DESC);
DROP INDEX IF EXISTS "Opening_recruiterId_idx";

CREATE INDEX "HiringProfile_openingId_isDeleted_status_idx"
  ON "hiringProfile"("openingId", "isDeleted", "status");
CREATE INDEX "HiringProfile_openingId_isDeleted_uploadedBy_submittedAt_idx"
  ON "hiringProfile"("openingId", "isDeleted", "uploadedBy", "submittedAt" DESC);
CREATE INDEX "HiringProfile_uploadedBy_isDeleted_submittedAt_idx"
  ON "hiringProfile"("uploadedBy", "isDeleted", "submittedAt" DESC);
DROP INDEX IF EXISTS "hiringProfile_openingId_idx";
