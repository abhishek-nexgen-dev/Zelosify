import { describe, expect, it } from "vitest";
import {
  APP_PERMISSIONS,
  ADMIN_PERMISSIONS,
  CANDIDATE_MANAGEMENT_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  JOB_MANAGEMENT_PERMISSIONS,
  IT_VENDOR_PERMISSIONS,
  RECRUITER_MANAGEMENT_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
} from "../../../src/utils/RBAC/permissions.js";

describe("role permission constants", () => {
  it("grants administrators every registered permission", () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual(APP_PERMISSIONS);
    for (const permission of APP_PERMISSIONS) {
      expect(hasPermission({ role: "ADMIN", permissions: ROLE_PERMISSIONS.ADMIN }, permission)).toBe(true);
    }
  });

  it("limits IT vendors to tenant openings and their profile-submission workflow", () => {
    expect(ADMIN_PERMISSIONS).toEqual(APP_PERMISSIONS);
    expect(IT_VENDOR_PERMISSIONS).toEqual([
      "JOBS_VIEW",
      "VENDOR_PROFILES_VIEW",
      "VENDOR_PROFILES_SUBMIT",
      "VENDOR_PROFILES_DELETE",
    ]);
    for (const permission of ["CANDIDATES_VIEW", "CANDIDATES_SHORTLIST", "CANDIDATES_REJECT", "JOBS_CREATE", "JOBS_UPDATE", "RECRUITER_CREATE", "RECRUITER_MANAGE"] as const) {
      expect(hasPermission({ role: "IT_VENDOR", permissions: [...APP_PERMISSIONS] }, permission)).toBe(false);
    }
    expect(hasPermission({ role: "IT_VENDOR", permissions: [...APP_PERMISSIONS] }, "VENDOR_PROFILES_SUBMIT")).toBe(true);
  });

  it("keeps the vendor permission set usable for profile submissions, but not candidate decisions", () => {
    for (const permission of IT_VENDOR_PERMISSIONS) {
      expect(hasPermission({ role: "IT_VENDOR", permissions: [...IT_VENDOR_PERMISSIONS] }, permission)).toBe(true);
    }
    expect(hasPermission({ role: "IT_VENDOR", permissions: [...IT_VENDOR_PERMISSIONS] }, "CANDIDATES_VIEW")).toBe(false);
    expect(hasPermission({ role: "IT_VENDOR", permissions: [...IT_VENDOR_PERMISSIONS] }, "CANDIDATES_SHORTLIST")).toBe(false);
    expect(hasPermission({ role: "IT_VENDOR", permissions: [...IT_VENDOR_PERMISSIONS] }, "CANDIDATES_REJECT")).toBe(false);
  });

  it("checks persisted permissions for every role instead of granting by role name", () => {
    expect(hasPermission({ role: "ADMIN", permissions: [] }, "JOBS_VIEW")).toBe(false);
    expect(hasPermission({ role: "IT_VENDOR", permissions: [] }, "JOBS_VIEW")).toBe(false);
    expect(hasPermission({ role: "RECRUITER", permissions: [] }, "JOBS_VIEW")).toBe(false);
    expect(hasPermission({ role: "HIRING_MANAGER", permissions: [] }, "JOBS_VIEW")).toBe(false);
  });

  it("defines job, candidate, and recruiter management permission groups", () => {
    expect(JOB_MANAGEMENT_PERMISSIONS).toEqual(["JOBS_VIEW", "JOBS_CREATE", "JOBS_UPDATE"]);
    expect(CANDIDATE_MANAGEMENT_PERMISSIONS).toEqual([
      "CANDIDATES_VIEW",
      "CANDIDATES_SHORTLIST",
      "CANDIDATES_REJECT",
    ]);
    expect(RECRUITER_MANAGEMENT_PERMISSIONS).toEqual([
      "TEAM_VIEW",
      "RECRUITER_CREATE",
      "RECRUITER_MANAGE",
    ]);
  });

  it("keeps recruiter and manager permissions role scoped", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.RECRUITER).not.toContain("RECRUITER_MANAGE");
    expect(DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER).not.toContain("RECRUITER_CREATE");
    expect(DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER).not.toContain("RECRUITER_MANAGE");
    expect(DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER).toContain("CANDIDATES_SHORTLIST");
    expect(DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER).toContain("CANDIDATES_REJECT");
    expect(DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER).toContain("JOBS_CREATE");
    expect(DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER).not.toContain("JOBS_UPDATE");
    expect(hasPermission({ role: "HIRING_MANAGER", permissions: ["JOBS_VIEW", "JOBS_CREATE"] }, "JOBS_CREATE")).toBe(true);
    expect(hasPermission({ role: "HIRING_MANAGER", permissions: ["JOBS_VIEW"] }, "JOBS_CREATE")).toBe(false);
    expect(hasPermission({ role: "RECRUITER", permissions: [] }, "RECRUITER_MANAGE")).toBe(false);
    expect(hasPermission({ role: "HIRING_MANAGER", permissions: ["JOBS_VIEW"] }, "JOBS_VIEW")).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.CANDIDATE).toEqual([]);
    expect(hasPermission({ role: "CANDIDATE", permissions: ["CANDIDATES_VIEW"] }, "CANDIDATES_VIEW")).toBe(false);
    expect(hasPermission({ role: "UNKNOWN_ROLE", permissions: [...APP_PERMISSIONS] }, "JOBS_VIEW")).toBe(false);
    expect(hasPermission(undefined, "JOBS_VIEW")).toBe(false);
  });
});
