export const APP_PERMISSIONS = [
  { key: "JOBS_VIEW", label: "View job openings" },
  { key: "JOBS_CREATE", label: "Create job openings" },
  { key: "JOBS_UPDATE", label: "Edit and close job openings" },
  { key: "CANDIDATES_VIEW", label: "View candidates and resumes" },
  { key: "CANDIDATES_SHORTLIST", label: "Shortlist candidates" },
  { key: "CANDIDATES_REJECT", label: "Reject candidates" },
  { key: "TEAM_VIEW", label: "View recruiting team" },
  { key: "RECRUITER_CREATE", label: "Create recruiter accounts" },
  { key: "RECRUITER_MANAGE", label: "Manage team permissions" },
  { key: "VENDOR_PROFILES_VIEW", label: "View own vendor submissions" },
  { key: "VENDOR_PROFILES_SUBMIT", label: "Submit candidate profiles" },
  { key: "VENDOR_PROFILES_DELETE", label: "Remove own vendor submissions" },
];

export const JOB_MANAGEMENT_PERMISSIONS = ["JOBS_VIEW", "JOBS_CREATE", "JOBS_UPDATE"];
export const CANDIDATE_MANAGEMENT_PERMISSIONS = [
  "CANDIDATES_VIEW",
  "CANDIDATES_SHORTLIST",
  "CANDIDATES_REJECT",
];
export const RECRUITER_MANAGEMENT_PERMISSIONS = [
  "TEAM_VIEW",
  "RECRUITER_CREATE",
  "RECRUITER_MANAGE",
];
export const VENDOR_MANAGEMENT_PERMISSIONS = [
  "VENDOR_PROFILES_VIEW",
  "VENDOR_PROFILES_SUBMIT",
  "VENDOR_PROFILES_DELETE",
];
export const ADMIN_PERMISSIONS = APP_PERMISSIONS.map(({ key }) => key);
export const IT_VENDOR_PERMISSIONS = ["JOBS_VIEW", ...VENDOR_MANAGEMENT_PERMISSIONS];

const ROLE_PERMISSION_CEILINGS = {
  ADMIN: ADMIN_PERMISSIONS,
  IT_VENDOR: IT_VENDOR_PERMISSIONS,
  RECRUITER: [...JOB_MANAGEMENT_PERMISSIONS, ...CANDIDATE_MANAGEMENT_PERMISSIONS],
  HIRING_MANAGER: [
    "JOBS_VIEW",
    "JOBS_CREATE",
    "CANDIDATES_VIEW",
    "CANDIDATES_SHORTLIST",
    "CANDIDATES_REJECT",
  ],
  CANDIDATE: [],
};

export function hasPermission(user, permission) {
  if (!user) return false;
  if (!Array.isArray(user.permissions) || !user.permissions.includes(permission)) return false;
  const roleCeiling = ROLE_PERMISSION_CEILINGS[user.role];
  return Boolean(roleCeiling?.includes(permission));
}

export function canManagePermissionTargets(user) {
  return user?.role === "ADMIN";
}

export function getCreatableTeamRoles(user) {
  if (!hasPermission(user, "RECRUITER_CREATE")) return [];
  if (user.role === "ADMIN") return ["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"];
  return [];
}

export function canCreateTeamMember(user) {
  return getCreatableTeamRoles(user).length > 0;
}

export function canCreateRecruiter(user) {
  return canCreateTeamMember(user);
}

export function canAssignHiringManagerToJob(user) {
  return user?.role === "ADMIN";
}

export function canAssignRecruiterToJob(user) {
  return canAssignHiringManagerToJob(user) ||
    (user?.role === "HIRING_MANAGER" && hasPermission(user, "JOBS_CREATE"));
}

export function canManageJobTeam(user) {
  return hasPermission(user, "JOBS_UPDATE") && canAssignRecruiterToJob(user);
}

export function getJobAssignmentPayload({ user, editing, form, originalAssignees = {} }) {
  const payload = {};
  const canChooseManager = canAssignHiringManagerToJob(user);

  if (
    canChooseManager &&
    (!editing || form.hiringManagerId !== (originalAssignees.hiringManagerId || ""))
  ) {
    payload.hiringManagerId = form.hiringManagerId || null;
  }
  if (
    canAssignRecruiterToJob(user) &&
    (!editing || form.recruiterId !== (originalAssignees.recruiterId || ""))
  ) {
    payload.recruiterId = form.recruiterId || null;
  } else if (!editing && user?.role === "RECRUITER") {
    payload.recruiterId = user.id;
  }

  return payload;
}
