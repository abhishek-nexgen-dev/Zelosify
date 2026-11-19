import type { RequestHandler } from "express";
import { hasPermission, type AppPermission } from "../../utils/RBAC/permissions.js";

export function requirePermission(permission: AppPermission): RequestHandler {
  return (req, res, next) => {
    const user = req.user as { role?: string; permissions?: string[] } | undefined;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }
    if (hasPermission(user, permission)) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
  };
}

export function requireAnyPermission(...permissions: AppPermission[]): RequestHandler {
  return (req, res, next) => {
    const user = req.user as { role?: string; permissions?: string[] } | undefined;
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }
    if (permissions.some((permission) => hasPermission(user, permission))) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
  };
}
