export const JOB_MANAGEMENT_PERMISSIONS = [
  "JOBS_VIEW",
  "JOBS_CREATE",
  "JOBS_UPDATE",
] as const;

export const CANDIDATE_MANAGEMENT_PERMISSIONS = [
  "CANDIDATES_VIEW",
  "CANDIDATES_SHORTLIST",
  "CANDIDATES_REJECT",
] as const;

export const RECRUITER_MANAGEMENT_PERMISSIONS = [
  "TEAM_VIEW",
  "RECRUITER_CREATE",
  "RECRUITER_MANAGE",
] as const;

export const VENDOR_MANAGEMENT_PERMISSIONS = [
  "VENDOR_PROFILES_VIEW",
  "VENDOR_PROFILES_SUBMIT",
  "VENDOR_PROFILES_DELETE",
] as const;

export const APP_PERMISSIONS = [
  ...JOB_MANAGEMENT_PERMISSIONS,
  ...CANDIDATE_MANAGEMENT_PERMISSIONS,
  ...RECRUITER_MANAGEMENT_PERMISSIONS,
  ...VENDOR_MANAGEMENT_PERMISSIONS,
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const ADMIN_PERMISSIONS: readonly AppPermission[] = [...APP_PERMISSIONS];
export const IT_VENDOR_PERMISSIONS: readonly AppPermission[] = [
  "JOBS_VIEW",
  ...VENDOR_MANAGEMENT_PERMISSIONS,
];

export const ROLE_PERMISSIONS: Record<"ADMIN" | "IT_VENDOR" | "RECRUITER" | "HIRING_MANAGER" | "CANDIDATE", AppPermission[]> = {
  ADMIN: [...ADMIN_PERMISSIONS],
  IT_VENDOR: [...IT_VENDOR_PERMISSIONS],
  RECRUITER: [...JOB_MANAGEMENT_PERMISSIONS, ...CANDIDATE_MANAGEMENT_PERMISSIONS],
  HIRING_MANAGER: [
    "JOBS_VIEW",
    "JOBS_CREATE",
    ...CANDIDATE_MANAGEMENT_PERMISSIONS,
  ],
  CANDIDATE: [],
};

export const DEFAULT_ROLE_PERMISSIONS: Record<"ADMIN" | "IT_VENDOR" | "RECRUITER" | "HIRING_MANAGER" | "CANDIDATE", AppPermission[]> = {
  ADMIN: [...ROLE_PERMISSIONS.ADMIN],
  IT_VENDOR: [...ROLE_PERMISSIONS.IT_VENDOR],
  RECRUITER: [...ROLE_PERMISSIONS.RECRUITER],
  HIRING_MANAGER: [...ROLE_PERMISSIONS.HIRING_MANAGER],
  CANDIDATE: [...ROLE_PERMISSIONS.CANDIDATE],
};

export function hasPermission(
  user: { role?: string; permissions?: string[] } | undefined,
  permission: AppPermission,
): boolean {
  if (!user) return false;
  if (!Array.isArray(user.permissions) || !user.permissions.includes(permission)) return false;

  const roleCeiling = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS];
  return Boolean(roleCeiling?.includes(permission));
}
