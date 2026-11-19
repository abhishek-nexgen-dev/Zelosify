import { Response } from "express";
import { AuthenticatedRequest } from "../../../types/common.js";
import asyncHandler from "../../../utils/handler/asyncHandler.js";
import { getAdminToken } from "../../../utils/keycloak/getAdminToken.js";
import { getClientSecret } from "../../../config/keycloak/keycloak.js";
import axios from "axios";
import { ENV } from "../../../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: ENV.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const refreshToken =
      req.cookies?.refresh_token || req.headers.authorization?.split(" ")[1];

    if (refreshToken && req.user?.provider === "KEYCLOAK") {
      try {
        const adminToken = await getAdminToken();
        const clientSecret = await getClientSecret(adminToken);
        if (!clientSecret) throw new Error("Keycloak client secret is unavailable.");

        await axios.post(
          `${ENV.KEYCLOAK_URL}/realms/${ENV.KEYCLOAK_REALM}/protocol/openid-connect/logout`,
          new URLSearchParams({
            client_id: ENV.KEYCLOAK_CLIENT_ID || "",
            client_secret: clientSecret,
            refresh_token: refreshToken,
          }),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 5000,
          },
        );
      } catch (error) {
        console.error("Keycloak logout failed:", error instanceof Error ? error.message : "Unknown error");
      }
    }

    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
    res.clearCookie("temp_token", cookieOptions);
    res.status(200).json({ message: "Logged out successfully" });
  },
);
