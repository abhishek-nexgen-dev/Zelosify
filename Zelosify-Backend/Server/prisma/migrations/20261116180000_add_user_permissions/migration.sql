ALTER TABLE "User"
ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Preserve the current capabilities for existing recruiter and manager accounts.
UPDATE "User"
SET "permissions" = ARRAY[
  'JOBS_VIEW',
  'JOBS_CREATE',
  'JOBS_UPDATE',
  'CANDIDATES_VIEW',
  'CANDIDATES_SHORTLIST',
  'CANDIDATES_REJECT'
]::TEXT[]
WHERE "role" = 'RECRUITER';

UPDATE "User"
SET "permissions" = ARRAY[
  'JOBS_VIEW',
  'JOBS_CREATE',
  'JOBS_UPDATE',
  'CANDIDATES_VIEW',
  'CANDIDATES_SHORTLIST',
  'CANDIDATES_REJECT',
  'TEAM_VIEW',
  'RECRUITER_CREATE'
]::TEXT[]
WHERE "role" = 'HIRING_MANAGER';
