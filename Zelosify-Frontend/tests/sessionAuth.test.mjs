import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardPathForRole } from "../src/utils/Auth/authUtils.js";
import {
  getLoginRedirectPath,
  isExpiredSessionMessage,
  isJwtExpired,
  isProtectedPath,
  redirectOnUnauthorizedSession,
} from "../src/utils/Auth/sessionAuth.js";

function tokenWithPayload(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encodedPayload}.signature`;
}

test("recognizes protected app routes only at their path boundaries", () => {
  assert.equal(isProtectedPath("/candidate/applications"), true);
  assert.equal(isProtectedPath("/admin/recruiters"), true);
  assert.equal(isProtectedPath("/candidate-jobs"), false);
  assert.equal(isProtectedPath("/jobs"), false);
});

test("redirects a protected route to login while preserving path and query", () => {
  assert.equal(
    getLoginRedirectPath("/candidate/applications", "?page=2"),
    "/login?returnTo=%2Fcandidate%2Fapplications%3Fpage%3D2"
  );
  assert.equal(getLoginRedirectPath("/", ""), null);
  assert.equal(getLoginRedirectPath("/login", ""), null);
  assert.equal(getLoginRedirectPath("/", "?from=home", true), "/login?returnTo=%2F%3Ffrom%3Dhome");
});

test("treats expired or malformed JWTs as unauthenticated", () => {
  assert.equal(isJwtExpired(tokenWithPayload({ exp: 101 }), 100), false);
  assert.equal(isJwtExpired(tokenWithPayload({ exp: 100 }), 100), true);
  assert.equal(isJwtExpired("not-a-token", 100), true);
  assert.equal(isJwtExpired(tokenWithPayload({ sub: "user" }), 100), true);
});

test("hides expired-session transport errors while preserving useful login errors", () => {
  assert.equal(isExpiredSessionMessage("Invalid or expired token"), true);
  assert.equal(isExpiredSessionMessage("Invalid or expired temp token"), true);
  assert.equal(isExpiredSessionMessage("Invalid TOTP code"), false);
  assert.equal(isExpiredSessionMessage("Invalid credentials"), false);
});

test("resolves dashboard destinations from the authenticated role", () => {
  assert.equal(getDashboardPathForRole("CANDIDATE"), "/candidate/dashboard");
  assert.equal(getDashboardPathForRole("HIRING_MANAGER"), "/dashboard");
  assert.equal(getDashboardPathForRole("unknown"), "/login");
});

test("clears session state and redirects protected API 401 responses", () => {
  let cleared = false;
  let redirected = "";
  const location = {
    pathname: "/candidate/applications",
    search: "?status=SUBMITTED",
    replace: (path) => {
      redirected = path;
    },
  };

  const handled = redirectOnUnauthorizedSession({ response: { status: 401 } }, location, () => {
    cleared = true;
  });

  assert.equal(handled, true);
  assert.equal(cleared, true);
  assert.equal(redirected, "/login?returnTo=%2Fcandidate%2Fapplications%3Fstatus%3DSUBMITTED");
});

test("does not redirect public pages or non-401 API failures", () => {
  let clearCount = 0;
  const location = { pathname: "/", search: "", replace: () => assert.fail("unexpected redirect") };
  assert.equal(
    redirectOnUnauthorizedSession({ response: { status: 401 } }, location, () => clearCount++),
    false
  );
  assert.equal(
    redirectOnUnauthorizedSession(
      { response: { status: 403 } },
      {
        pathname: "/candidate/applications",
        search: "",
        replace: () => assert.fail("unexpected redirect"),
      },
      () => clearCount++
    ),
    false
  );
  assert.equal(clearCount, 0);
});
