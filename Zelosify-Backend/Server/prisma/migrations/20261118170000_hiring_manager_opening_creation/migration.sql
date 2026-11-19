-- Hiring Managers may create openings assigned to themselves. They still
-- cannot edit/close openings or assign another Hiring Manager.
UPDATE "User"
SET "permissions" = array_append("permissions", 'JOBS_CREATE')
WHERE "role" = 'HIRING_MANAGER'
  AND NOT ('JOBS_CREATE' = ANY("permissions"));
