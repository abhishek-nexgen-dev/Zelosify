-- Persist only the permissions allowed by the assignment role contract.
-- Runtime authorization also applies role ceilings, so this migration brings
-- existing permission arrays and /auth/user output into agreement.
UPDATE "User"
SET "permissions" = ARRAY[
  'JOBS_VIEW',
  'VENDOR_PROFILES_VIEW',
  'VENDOR_PROFILES_SUBMIT',
  'VENDOR_PROFILES_DELETE'
]
WHERE "role" = 'IT_VENDOR';

UPDATE "User"
SET "permissions" = ARRAY[
  'JOBS_VIEW',
  'CANDIDATES_VIEW',
  'CANDIDATES_SHORTLIST',
  'CANDIDATES_REJECT'
]
WHERE "role" = 'HIRING_MANAGER';

-- Candidate accounts receive their normal candidate capabilities through
-- candidate-specific routes, not the internal team permission system.
UPDATE "User"
SET "permissions" = ARRAY[]::TEXT[]
WHERE "role" = 'CANDIDATE';
