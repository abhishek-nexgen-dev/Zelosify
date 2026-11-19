import type { Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import prisma from "../../../../config/prisma/prisma.js";
import { ENV } from "../../../../config/env.js";
import { generateTempToken } from "../../../../utils/jwt/generateTempToken.js";

export async function getTOTPSetupQR(req: Request, res: Response): Promise<void> {
  const authHeader = req.headers?.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;
  const headerToken = typeof req.headers?.["x-temp-token"] === "string" ? req.headers["x-temp-token"] : undefined;
  const queryToken = typeof req.query?.token === "string" ? req.query.token : undefined;

  const tempToken = req.cookies?.temp_token || bearerToken || headerToken || queryToken;

  if (!tempToken) {
    if (req.headers?.accept?.includes("text/html")) {
      res.status(401).setHeader("Content-Type", "text/html").send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Zelosify - Authenticator Setup</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }
            h1 { font-size: 20px; margin-bottom: 12px; color: #38bdf8; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
            a.btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px; }
            a.btn:hover { background: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Zelosify TOTP 2FA Setup</h1>
            <p>Authentication required. Please sign in with your password first to configure your two-factor authenticator.</p>
            <a class="btn" href="${ENV.FRONTEND_URL || "http://localhost:5173"}/login">Go to Login</a>
          </div>
        </body>
        </html>
      `);
      return;
    }

    res.status(401).json({ message: "Login session is missing or expired. Please submit your password again." });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(tempToken, ENV.JWT_SECRET, {
      algorithms: ["HS256"],
      audience: "zelosify-totp",
      issuer: "zelosify",
    }) as JwtPayload;
  } catch {
    res.status(401).json({ message: "Login session is invalid or expired. Please submit your password again." });
    return;
  }

  if (
    decoded.purpose !== "totp" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.refreshToken !== "string" ||
    (decoded.pendingTotpSecret !== undefined && typeof decoded.pendingTotpSecret !== "string")
  ) {
    res.status(401).json({ message: "Invalid TOTP setup session." });
    return;
  }

  try {
    let user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, totpSecret: true, totpVerifiedAt: true },
    });
    if (!user) {
      res.status(401).json({ message: "User not found." });
      return;
    }
    if (!user.totpSecret) {
      const pendingSecret = authenticator.generateSecret();
      await prisma.user.updateMany({
        where: { id: user.id, totpSecret: null, totpVerifiedAt: null },
        data: { totpSecret: pendingSecret },
      });
      user = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, email: true, totpSecret: true, totpVerifiedAt: true },
      });
      if (!user || user.totpVerifiedAt || !user.totpSecret) {
        res.status(409).json({ message: "Authenticator setup changed. Please sign in again." });
        return;
      }
    }

    const isReplacement = Boolean(user.totpVerifiedAt);
    let secretForQr = user.totpSecret;
    if (isReplacement) {
      // Keep the active factor valid until the new authenticator proves ownership.
      secretForQr =
        typeof decoded.pendingTotpSecret === "string"
          ? decoded.pendingTotpSecret
          : authenticator.generateSecret();
      res.cookie(
        "temp_token",
        generateTempToken(decoded.userId, decoded.refreshToken, secretForQr),
        {
          httpOnly: true,
          secure: ENV.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 5 * 60 * 1000,
          path: "/",
        },
      );
    }

    const otpAuthUrl = authenticator.keyuri(user.email, ENV.KEYCLOAK_REALM, secretForQr);
    const qrCode = await QRCode.toDataURL(otpAuthUrl);
    res.setHeader("Cache-Control", "no-store");

    if (req.headers?.accept?.includes("text/html")) {
      res.setHeader("Content-Type", "text/html").send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Zelosify - TOTP QR Setup</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }
            h1 { font-size: 20px; margin-bottom: 6px; color: #38bdf8; }
            .user-info { font-size: 14px; color: #94a3b8; margin-bottom: 20px; }
            .qr-wrapper { background: #ffffff; padding: 16px; border-radius: 8px; display: inline-block; margin-bottom: 20px; }
            .qr-wrapper img { display: block; width: 200px; height: 200px; }
            .secret-box { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 15px; color: #e2e8f0; letter-spacing: 1.5px; word-break: break-all; margin-bottom: 16px; }
            p.desc { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Two-Factor Authentication Setup</h1>
            <div class="user-info">${user.email}</div>
            <div class="qr-wrapper">
              <img src="${qrCode}" alt="Scan TOTP QR Code" />
            </div>
            <div class="secret-box">${secretForQr}</div>
            <p class="desc">Scan the QR code with Google Authenticator or Microsoft Authenticator, then verify a code to ${isReplacement ? "replace" : "finish setting up"} your authenticator.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    res.json({ qrCode, replacement: isReplacement });
  } catch (error) {
    console.error("[Auth] TOTP setup QR generation failed:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({ message: "Could not generate the authenticator setup QR." });
  }
}
