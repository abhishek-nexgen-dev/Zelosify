import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import prisma from "../../../../config/prisma/prisma.js";
import { authenticator } from "otplib";
import { getKeycloakClientSecret } from "../../../../utils/keycloak/getKeycloakClientSecret.js";
import axios from "axios";
import { ENV } from "../../../../config/env.js";

export const verifyTOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { totp } = req.body;
    const tempToken = req.cookies?.temp_token;

    if (!tempToken) {
      res.status(401).json({
        message: "Login session is missing or expired. Please submit your password again.",
      });
      return;
    }

    if (typeof totp !== "string" || !totp) {
      res.status(400).json({ message: "Enter the 6-digit code from your authenticator app." });
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(tempToken, ENV.JWT_SECRET, { algorithms: ["HS256"], audience: "zelosify-totp", issuer: "zelosify" }) as JwtPayload;
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired temp token" });
      return;
    }

    const { userId, refreshToken } = decoded;
    const pendingTotpSecret = decoded.pendingTotpSecret;
    if (
      decoded.purpose !== "totp" ||
      typeof userId !== "string" ||
      typeof refreshToken !== "string" ||
      (pendingTotpSecret !== undefined && typeof pendingTotpSecret !== "string")
    ) {
      res.status(401).json({ message: "Invalid or expired temp token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        department: true,
        totpSecret: true,
        totpVerifiedAt: true,
        tenant: {
          select: {
            tenantId: true,
            companyName: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    if (!user.totpSecret) {
      res.status(401).json({ message: "TOTP enrollment is required" });
      return;
    }
    // Accept two adjacent 30-second windows to tolerate ordinary phone/server
    // clock drift and requests that reach the server near a time-step boundary.
    const totpVerifier = authenticator.create({
      ...authenticator.options,
      window: 2,
    });
    const isReplacementCode =
      typeof pendingTotpSecret === "string" &&
      totpVerifier.verify({ token: totp, secret: pendingTotpSecret });
    const isCurrentCode = totpVerifier.verify({ token: totp, secret: user.totpSecret });

    if (!isReplacementCode && !isCurrentCode) {
      res.status(401).json({ message: "Invalid TOTP code" });
      return;
    }

    if (isReplacementCode && typeof pendingTotpSecret === "string") {
      const replacement = await prisma.user.updateMany({
        where: {
          id: user.id,
          totpSecret: user.totpSecret,
          totpVerifiedAt: user.totpVerifiedAt,
        },
        data: { totpSecret: pendingTotpSecret, totpVerifiedAt: new Date() },
      });
      if (replacement.count === 0) {
        res.status(409).json({ message: "Authenticator setup changed. Please sign in again." });
        return;
      }
    } else if (!user.totpVerifiedAt) {
      const activation = await prisma.user.updateMany({
        where: { id: user.id, totpVerifiedAt: null, totpSecret: user.totpSecret },
        data: { totpVerifiedAt: new Date() },
      });
      if (activation.count === 0) {
        const latest = await prisma.user.findUnique({
          where: { id: user.id },
          select: { totpSecret: true, totpVerifiedAt: true },
        });
        if (!latest || latest.totpSecret !== user.totpSecret || !latest.totpVerifiedAt) {
          res.status(409).json({ message: "Authenticator setup changed. Please sign in again." });
          return;
        }
      }
    }

    let accessToken: string | null = null;
    let newRefreshToken: string | null = null;

    try {
      const clientSecret = await getKeycloakClientSecret();
      const tokenResponse = await axios.post(
        `${ENV.KEYCLOAK_URL}/realms/${ENV.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: "refresh_token",
          client_id: ENV.KEYCLOAK_CLIENT_ID,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 }
      );
      accessToken = tokenResponse.data.access_token;
      newRefreshToken = tokenResponse.data.refresh_token;
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const errorCode = axios.isAxiosError(error) ? error.code : undefined;
      console.error(JSON.stringify({
        level: "error",
        event: "TOTP_KEYCLOAK_REFRESH_FAILED",
        ...(status ? { httpStatus: status } : {}),
        ...(errorCode ? { errorCode } : {}),
      }));
    }

    if (!accessToken || !newRefreshToken) {
      res.clearCookie("temp_token", { httpOnly: true, secure: ENV.NODE_ENV === "production", sameSite: "strict", path: "/" });
      res.status(401).json({ message: "Your code was accepted, but the sign-in session expired. Please sign in again." });
      return;
    }

    const accessTokenMaxAge = ENV.ACCESS_TOKEN_MAX_AGE_MS;
    const refreshTokenMaxAge = ENV.REFRESH_TOKEN_MAX_AGE_MS;

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: accessTokenMaxAge,
      path: "/",
    });

    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: refreshTokenMaxAge,
      path: "/",
    });

    res.clearCookie("temp_token");

    const { totpSecret, totpVerifiedAt, ...userData } = user;

    res.json({
      message: "TOTP verified successfully. Login successful.",
      user: userData,
    });
  } catch (error) {
    console.error(
      "[Auth] TOTP verification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    res.status(500).json({ message: "Internal server error" });
  }
};
