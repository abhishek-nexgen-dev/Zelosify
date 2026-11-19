import { describe, it, expect, vi } from "vitest";
import { authorizeRole } from "../../../src/middlewares/auth/authorizeMiddleware.js";
import type { Response, NextFunction } from "express";

describe("Security & Multi-Tenant RBAC Authorization", () => {
  const createMockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("denies access when token and user context are missing", async () => {
    const req: any = { headers: {}, cookies: {} };
    const res = createMockRes();
    const next: NextFunction = vi.fn();

    const middleware = authorizeRole("CANDIDATE");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Missing token" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects unauthorized role provided to authorizeRole", async () => {
    const req: any = { headers: { authorization: "Bearer some-token" }, cookies: {} };
    const res = createMockRes();
    const next: NextFunction = vi.fn();

    const middleware = authorizeRole("SUPER_HACKER_ROLE");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invalid role provided." }));
    expect(next).not.toHaveBeenCalled();
  });

  it("allows access when req.user has the exact required role", async () => {
    const req: any = {
      headers: {},
      cookies: {},
      user: {
        id: "candidate-123",
        role: "CANDIDATE",
        tenantId: "tenant-bwc",
      },
    };
    const res = createMockRes();
    const next: NextFunction = vi.fn();

    const middleware = authorizeRole("CANDIDATE");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("denies access when user has HIRING_MANAGER role but tries to access CANDIDATE endpoint", async () => {
    const req: any = {
      headers: {},
      cookies: {},
      user: {
        id: "hm-123",
        role: "HIRING_MANAGER",
        tenantId: "tenant-bwc",
      },
    };
    const res = createMockRes();
    const next: NextFunction = vi.fn();

    const middleware = authorizeRole("CANDIDATE");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Access Denied: User does not have required role CANDIDATE"),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("denies access when candidate tries to access HIRING_MANAGER endpoint", async () => {
    const req: any = {
      headers: {},
      cookies: {},
      user: {
        id: "candidate-123",
        role: "CANDIDATE",
        tenantId: "tenant-bwc",
      },
    };
    const res = createMockRes();
    const next: NextFunction = vi.fn();

    const middleware = authorizeRole("HIRING_MANAGER");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Access Denied: User does not have required role HIRING_MANAGER"),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("keeps tenant vendor accounts out of general candidate review routes", async () => {
    const req: any = {
      headers: {},
      cookies: {},
      user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-bwc" },
    };
    const res = createMockRes();
    const next: NextFunction = vi.fn();

    await authorizeRole("ADMIN", "RECRUITER", "HIRING_MANAGER")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
