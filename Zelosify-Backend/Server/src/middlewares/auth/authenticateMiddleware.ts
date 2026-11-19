import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import prisma from "../../config/prisma/prisma.js";
import { ENV } from "../../config/env.js";

let cachedJwksClient: ReturnType<typeof jwksClient> | null = null;
let cachedJwksUri = "";

function getKeycloakJwksClient() {
  const jwksUri = `${ENV.KEYCLOAK_URL}/realms/${ENV.KEYCLOAK_REALM}/protocol/openid-connect/certs`;
  if (!cachedJwksClient || cachedJwksUri !== jwksUri) {
    cachedJwksUri = jwksUri;
    cachedJwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 86400000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return cachedJwksClient;
}


declare module "express-serve-static-core" {
  interface Request {
    user?: any;
  }
}


export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.access_token;

    if (!token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload) {
      res.status(401).json({ message: "Invalid token format" });
      return;
    }


    let verified: jwt.JwtPayload | null = null;
    try {
      if (decoded.header.kid) {
        const key = await getKeycloakJwksClient().getSigningKey(decoded.header.kid);
        const signingKey = key.getPublicKey();
        verified = jwt.verify(token, signingKey, {
          algorithms: ["RS256"],
          issuer: `${ENV.KEYCLOAK_URL}/realms/${ENV.KEYCLOAK_REALM}`,
        }) as jwt.JwtPayload;
      }
    } catch {

    }

    if (!verified || typeof verified !== "object") {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const userIdKey = verified.sub;
    if (typeof userIdKey !== "string" || !userIdKey || verified.typ !== "Bearer") {
      res.status(401).json({ message: "Invalid access token" });
      return;
    }


    const user = await prisma.user.findFirst({
      where: {
        externalId: userIdKey,
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        permissions: true,
        department: true,
        provider: true,
        tenantId: true,
        tenant: {
          select: {
            tenantId: true,
            companyName: true,
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found for token identifier: ${userIdKey}`);
      res.status(401).json({ message: "User not found" });
      return;
    }




    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
