import type { Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../../types/typeIndex.js";
import { formatPublicKey } from "../../utils/jwt/formatPubKey.js";
import { isValidRole } from "../../utils/RBAC/isValidRole.js";
import { ENV } from "../../config/env.js";

const getPublicKey = () => formatPublicKey(ENV.KEYCLOAK_RS256_SIG);





export function authorizeRole(...requiredRoles: string[]): RequestHandler {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {

    if (req.user) {
      const userRole = req.user.role;

      if (userRole === "ADMIN" || requiredRoles.includes(userRole)) {
        console.log(`Authorize Role Middleware Passed ✅ (user context: ${userRole})`);
        next();
        return;
      } else {
        res.status(403).json({
          message: `Access Denied: User does not have required role ${requiredRoles.join(", ")}`,
        });
        return;
      }
    }

    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.access_token;

    if (!token) {
      res.status(401).json({ message: "Missing token" });
      return;
    }


    const hasInvalid = requiredRoles.some((r) => !isValidRole(r));
    if (hasInvalid) {
      res.status(400).json({ message: "Invalid role provided." });
      return;
    }


    const publicKey = getPublicKey();
    if (publicKey) {
      try {
        const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as jwt.JwtPayload;
        const roles = decoded.realm_access?.roles || [];
        const isAuthorized =
          roles.includes("ADMIN") ||
          decoded.role === "ADMIN" ||
          requiredRoles.some((r) => roles.includes(r) || decoded.role === r);

        if (isAuthorized) {
          console.log("Authorize Role Middleware Passed ✅ : ", req.user || decoded);
          next();
          return;
        }
      } catch {

      }
    }


    if (ENV.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as jwt.JwtPayload;
        const roles = decoded.realm_access?.roles || (decoded.roles ? decoded.roles : []);
        const isAuthorized =
          roles.includes("ADMIN") ||
          decoded.role === "ADMIN" ||
          requiredRoles.some((r) => roles.includes(r) || decoded.role === r);

        if (isAuthorized) {
          console.log("Authorize Role Middleware Passed via JWT_SECRET ✅ : ", req.user || decoded);
          next();
          return;
        }
      } catch {

      }
    }

    res.status(403).json({
      message: `Access Denied: User does not have required role ${requiredRoles.join(", ")}`,
    });
  };
}
