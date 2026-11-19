import test from "node:test";
import assert from "node:assert/strict";
import { getTOTPSetupError } from "../src/utils/Auth/totpSetupError.js";

test("explains that the sign-in backend cannot be reached", () => {
  const message = getTOTPSetupError({ message: "Network Error" });
  assert.match(message, /cannot reach the sign-in service/i);
  assert.match(message, /NEXT_PUBLIC_BACKEND_URL/);
});

test("asks the user to restart sign-in when the temporary session expired", () => {
  assert.match(
    getTOTPSetupError({
      response: { status: 401, data: { message: "Invalid or expired temp token" } },
    }),
    /session has expired/i
  );
});

test("explains setup conflicts using the safe backend message", () => {
  assert.match(
    getTOTPSetupError({
      response: {
        status: 409,
        data: { message: "Authenticator setup changed. Please sign in again." },
      },
    }),
    /setup changed/i
  );
});

test("preserves safe backend errors and falls back when none is supplied", () => {
  assert.equal(
    getTOTPSetupError({ response: { status: 500, data: { message: "QR generation failed." } } }),
    "QR generation failed."
  );
  assert.equal(
    getTOTPSetupError({ response: { status: 500, data: {} } }),
    "Could not load your setup QR. Try again."
  );
});
