import axios from "axios";
import type { Request, Response } from "express";
import prisma from "../../../../config/prisma/prisma.js";
import { getKeycloakClientSecret } from "../../../../utils/keycloak/getKeycloakClientSecret.js";
import { generateTempToken } from "../../../../utils/jwt/generateTempToken.js";
import { ENV } from "../../../../config/env.js";

function getSafeAuthFailureDetails(error: unknown): Record<string, string | number> {
  if (typeof error !== "object" || error === null) return {};
  const details = error as Record<string, unknown>;
  const response = typeof details.response === "object" && details.response !== null
    ? details.response as Record<string, unknown>
    : undefined;
  const body = typeof response?.data === "object" && response.data !== null
    ? response.data as Record<string, unknown>
    : undefined;
  const providerErrorCode = body?.error;
  const transportCode = details.code;
  return {
    ...(typeof response?.status === "number" ? { httpStatus: response.status } : {}),
    ...(typeof providerErrorCode === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(providerErrorCode)
      ? { providerErrorCode }
      : {}),
    ...(typeof transportCode === "string" && /^[A-Z0-9_]{1,40}$/.test(transportCode)
      ? { errorCode: transportCode }
      : {}),
  };
}

export async function verifyLogin(req: Request, res: Response): Promise<void> {
  const { usernameOrEmail, password } = req.body;
  if (typeof usernameOrEmail !== "string" || typeof password !== "string" || !usernameOrEmail.trim() || !password) {
    res.status(400).json({ message: "Username/Email and password are required" });
    return;
  }
  try {
    const identifier = usernameOrEmail.trim();
    const isEmail = identifier.includes("@");
    const normalizedIdentifier = isEmail ? identifier.toLowerCase() : identifier;
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: normalizedIdentifier, mode: "insensitive" } }
        : { username: normalizedIdentifier },
      select: { id: true, username: true, email: true, provider: true, totpVerifiedAt: true },
    });
    if (!user || user.provider !== "KEYCLOAK") {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const clientSecret = await getKeycloakClientSecret();
    try {
      const response = await axios.post(
        `${ENV.KEYCLOAK_URL}/realms/${ENV.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({ grant_type: "password", client_id: ENV.KEYCLOAK_CLIENT_ID || "dynamic-client", client_secret: clientSecret, username: user.username || user.email, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 },
      );
      const refreshToken: unknown = response.data?.refresh_token;
      if (typeof refreshToken !== "string" || !refreshToken) throw new Error("Missing refresh token");
      // Every account must complete TOTP; usernames never confer an MFA exemption.
      res.cookie("temp_token", generateTempToken(user.id, refreshToken), {
        httpOnly: true, secure: ENV.NODE_ENV === "production", sameSite: "strict", maxAge: 5 * 60 * 1000, path: "/",
      });
      res.json({
        message: user.totpVerifiedAt
          ? "Login verified. Please enter your TOTP code."
          : "Login verified. Complete your authenticator setup.",
        totpSetupRequired: !user.totpVerifiedAt,
      });
    } catch (error) {
      console.warn(JSON.stringify({
        level: "warn",
        event: "KEYCLOAK_PASSWORD_GRANT_FAILED",
        ...getSafeAuthFailureDetails(error),
      }));
      res.status(401).json({ message: "Invalid credentials or identity service unavailable" });
    }
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      && typeof error.code === "string" && /^[A-Z][A-Z0-9_]{1,30}$/.test(error.code)
      ? error.code
      : undefined;
    console.error(JSON.stringify({
      level: "error",
      event: "AUTH_LOGIN_PREPARATION_FAILED",
      ...(code ? { errorCode: code } : {}),
    }));
    res.status(503).json({ message: "Authentication service unavailable" });
  }
}
