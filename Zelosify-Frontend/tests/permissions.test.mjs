import assert from "node:assert/strict";
import test from "node:test";
import {
  canAssignHiringManagerToJob,
  canAssignRecruiterToJob,
  canManageJobTeam,
  canCreateRecruiter,
  canCreateTeamMember,
  canManagePermissionTargets,
  getCreatableTeamRoles,
  getJobAssignmentPayload,
  hasPermission,
} from "../src/features/auth/permissions.js";

test("permission checks use the authenticated user's stored permission array", () => {
  assert.equal(hasPermission({ role: "RECRUITER", permissions: ["JOBS_VIEW"] }, "JOBS_VIEW"), true);
  assert.equal(
    hasPermission({ role: "RECRUITER", permissions: ["JOBS_VIEW"] }, "JOBS_CREATE"),
    false
  );
  assert.equal(hasPermission({ role: "ADMIN", permissions: [] }, "JOBS_CREATE"), false);
  assert.equal(
    hasPermission({ role: "IT_VENDOR", permissions: ["JOBS_VIEW", "CANDIDATES_VIEW"] }, "CANDIDATES_VIEW"),
    false
  );
  assert.equal(
    hasPermission({ role: "HIRING_MANAGER", permissions: ["JOBS_VIEW", "JOBS_UPDATE"] }, "JOBS_UPDATE"),
    false
  );
  assert.equal(
    hasPermission({ role: "HIRING_MANAGER", permissions: ["JOBS_VIEW", "JOBS_CREATE"] }, "JOBS_CREATE"),
    true
  );
  assert.equal(
    hasPermission({ role: "CANDIDATE", permissions: ["CANDIDATES_VIEW", "JOBS_CREATE"] }, "CANDIDATES_VIEW"),
    false
  );
  assert.equal(hasPermission({ role: "UNKNOWN_ROLE", permissions: ["JOBS_VIEW"] }, "JOBS_VIEW"), false);
});

test("only admins can open the permission management page", () => {
  assert.equal(canManagePermissionTargets({ role: "ADMIN" }), true);
  assert.equal(canManagePermissionTargets({ role: "IT_VENDOR" }), false);
  assert.equal(canManagePermissionTargets({ role: "HIRING_MANAGER" }), false);
  assert.equal(canManagePermissionTargets({ role: "CANDIDATE" }), false);
});

test("team creation options are limited to admin grants", () => {
  const teamCreationPermission = ["RECRUITER_CREATE"];
  assert.deepEqual(getCreatableTeamRoles({ role: "ADMIN", permissions: teamCreationPermission }), [
    "RECRUITER",
    "HIRING_MANAGER",
    "IT_VENDOR",
  ]);
  assert.deepEqual(getCreatableTeamRoles({ role: "IT_VENDOR", permissions: teamCreationPermission }), []);
  assert.deepEqual(
    getCreatableTeamRoles({ role: "HIRING_MANAGER", permissions: teamCreationPermission }),
    []
  );
  assert.deepEqual(
    getCreatableTeamRoles({ role: "RECRUITER", permissions: teamCreationPermission }),
    []
  );
  assert.deepEqual(getCreatableTeamRoles({ role: "ADMIN", permissions: [] }), []);
  assert.equal(canCreateTeamMember({ role: "ADMIN", permissions: teamCreationPermission }), true);
  assert.equal(
    canCreateTeamMember({ role: "RECRUITER", permissions: teamCreationPermission }),
    false
  );

  assert.equal(canCreateRecruiter({ role: "ADMIN", permissions: ["RECRUITER_CREATE"] }), true);
  assert.equal(
    canCreateRecruiter({ role: "HIRING_MANAGER", permissions: ["RECRUITER_CREATE"] }),
    false
  );
  assert.equal(canCreateRecruiter({ role: "IT_VENDOR", permissions: ["RECRUITER_CREATE"] }), false);
  assert.equal(canCreateRecruiter({ role: "RECRUITER", permissions: ["RECRUITER_CREATE"] }), false);
});

test("admins assign both roles; hiring managers can assign only a recruiter on creation", () => {
  for (const role of ["ADMIN"]) {
    const user = { role, permissions: ["JOBS_UPDATE"] };
    assert.equal(canAssignHiringManagerToJob(user), true);
    assert.equal(canAssignRecruiterToJob(user), true);
    assert.equal(canManageJobTeam(user), true);
  }

  const vendor = { role: "IT_VENDOR", permissions: ["JOBS_UPDATE"] };
  assert.equal(canAssignHiringManagerToJob(vendor), false);
  assert.equal(canAssignRecruiterToJob(vendor), false);
  assert.equal(canManageJobTeam(vendor), false);

  const manager = { role: "HIRING_MANAGER", permissions: ["JOBS_VIEW", "JOBS_CREATE"] };
  assert.equal(canAssignHiringManagerToJob(manager), false);
  assert.equal(canAssignRecruiterToJob(manager), true);
  assert.equal(canManageJobTeam(manager), false);

  const recruiter = { role: "RECRUITER", permissions: ["JOBS_UPDATE"] };
  assert.equal(canAssignHiringManagerToJob(recruiter), false);
  assert.equal(canAssignRecruiterToJob(recruiter), false);
  assert.equal(canManageJobTeam(recruiter), false);
  assert.equal(canManageJobTeam({ role: "HIRING_MANAGER", permissions: [] }), false);
});

test("job create and edit payloads include only assignments allowed for the role", () => {
  const form = { hiringManagerId: "manager-2", recruiterId: "recruiter-2" };
  const originalAssignees = { hiringManagerId: "manager-1", recruiterId: "recruiter-1" };

  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "ADMIN" },
      editing: true,
      form,
      originalAssignees,
    }),
    { hiringManagerId: "manager-2", recruiterId: "recruiter-2" }
  );
  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "HIRING_MANAGER" },
      editing: true,
      form,
      originalAssignees,
    }),
    {}
  );
  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "HIRING_MANAGER", id: "manager-1", permissions: ["JOBS_CREATE"] },
      editing: false,
      form: { hiringManagerId: "manager-1", recruiterId: "recruiter-2" },
    }),
    { recruiterId: "recruiter-2" }
  );
  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "HIRING_MANAGER" },
      editing: true,
      form: { hiringManagerId: "manager-1", recruiterId: "" },
      originalAssignees,
    }),
    {}
  );
  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "ADMIN" },
      editing: true,
      form: originalAssignees,
      originalAssignees,
    }),
    {}
  );
  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "RECRUITER", id: "recruiter-1" },
      editing: true,
      form,
      originalAssignees,
    }),
    {}
  );
  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "RECRUITER", id: "recruiter-1" },
      editing: false,
      form,
    }),
    { recruiterId: "recruiter-1" }
  );
  assert.deepEqual(
    getJobAssignmentPayload({
      user: { role: "ADMIN" },
      editing: false,
      form: { hiringManagerId: "", recruiterId: "" },
    }),
    { hiringManagerId: null, recruiterId: null }
  );
});
