-- Permissions are enforced from User.permissions at runtime. Backfill current
-- privileged accounts so existing users retain the access assigned to them.
UPDATE "User"
SET "permissions" = ARRAY[
  'JOBS_VIEW',
  'JOBS_CREATE',
  'JOBS_UPDATE',
  'CANDIDATES_VIEW',
  'CANDIDATES_SHORTLIST',
  'CANDIDATES_REJECT',
  'TEAM_VIEW',
  'RECRUITER_CREATE',
  'RECRUITER_MANAGE'
]::TEXT[]
WHERE "role" IN ('ADMIN', 'IT_VENDOR');

-- Hiring managers may edit recruiter permissions and remove recruiter
-- accounts. Keep any other explicitly assigned permissions intact.
UPDATE "User"
SET "permissions" = ARRAY(
  SELECT DISTINCT permission
  FROM unnest(
    COALESCE("permissions", ARRAY[]::TEXT[]) || ARRAY['RECRUITER_MANAGE']::TEXT[]
  ) AS permission_values(permission)
  ORDER BY permission
)
WHERE "role" = 'HIRING_MANAGER';
