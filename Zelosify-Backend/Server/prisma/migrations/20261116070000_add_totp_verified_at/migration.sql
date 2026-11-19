ALTER TABLE "User" ADD COLUMN "totpVerifiedAt" TIMESTAMP(3);

-- Existing TOTP secrets were already used by the established login flow.
-- Preserve those accounts as enrolled; new registrations remain pending.
UPDATE "User"
SET "totpVerifiedAt" = "updatedAt"
WHERE "totpSecret" IS NOT NULL;
