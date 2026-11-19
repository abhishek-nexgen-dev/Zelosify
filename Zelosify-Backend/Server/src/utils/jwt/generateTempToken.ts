import jwt from "jsonwebtoken";
import { ENV } from "../../constants/env.js";

export function generateTempToken(
  userId: string,
  refreshToken?: string,
  pendingTotpSecret?: string,
) {
  if (!ENV.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign(
    { userId, refreshToken, purpose: "totp", ...(pendingTotpSecret ? { pendingTotpSecret } : {}) },
    ENV.JWT_SECRET,
    {
      expiresIn: "5m",
      algorithm: "HS256",
      audience: "zelosify-totp",
      issuer: "zelosify",
    },
  );
}
