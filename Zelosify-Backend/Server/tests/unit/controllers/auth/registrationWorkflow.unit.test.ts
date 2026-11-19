import { describe, it, expect, vi, beforeEach } from "vitest";
import { register } from "../../../../src/controllers/auth/local/register/localRegister.js";
import { registerCandidateSchema } from "../../../../src/validations/authValidation.js";
import prisma from "../../../../src/config/prisma/prisma.js";
import axios from "axios";
import { createKeycloakUser } from "../../../../src/utils/keycloak/createKeycloakUser.js";
import { getAdminToken } from "../../../../src/utils/keycloak/getAdminToken.js";
import { getKeycloakClientSecret } from "../../../../src/utils/keycloak/getKeycloakClientSecret.js";

vi.mock("../../../../src/config/prisma/prisma.js", () => ({ default: {
  tenants: { findUnique: vi.fn(), create: vi.fn() },
  user: { findFirst: vi.fn(), create: vi.fn() },
} }));
vi.mock("../../../../src/utils/keycloak/getAdminToken.js", () => ({ getAdminToken: vi.fn() }));
vi.mock("../../../../src/utils/keycloak/getKeycloakClientSecret.js", () => ({ getKeycloakClientSecret: vi.fn().mockResolvedValue("test-client-secret") }));
vi.mock("../../../../src/utils/keycloak/createKeycloakUser.js", () => ({
  createKeycloakUser: vi.fn().mockResolvedValue({ id: "identity-id" }),
}));
vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), cookie: vi.fn() };
}
const candidate = { username: "candidate", email: "candidate@example.test", password: "safe-test-password" };
async function run(body = candidate) {
  const res = response();
  await new Promise<void>((resolve, reject) => {
    res.json.mockImplementation(() => { resolve(); return res; });
    register({ body } as never, res as never, (error) => error ? reject(error) : resolve());
  });
  return res;
}

describe("Candidate registration security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("DEFAULT_TENANT_ID", "configured-tenant");
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.tenants.findUnique).mockResolvedValue({ tenantId: "configured-tenant" } as never);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "candidate-id", ...candidate, role: "CANDIDATE", tenantId: "configured-tenant", provider: "KEYCLOAK" } as never);
    vi.mocked(createKeycloakUser).mockResolvedValue({ id: "identity-id" });
    vi.mocked(getAdminToken).mockResolvedValue("test-admin-token");
    vi.mocked(getKeycloakClientSecret).mockResolvedValue("test-client-secret");
    vi.mocked(axios.get).mockResolvedValue({ data: { id: "candidate-role" } });
    vi.mocked(axios.post).mockImplementation(async (url) => {
      if (String(url).includes("/protocol/openid-connect/token")) {
        return { data: { refresh_token: "test-refresh-token" } } as never;
      }
      return { status: 204 } as never;
    });
  });
  it.each(["ADMIN", "IT_VENDOR", "RECRUITER", "HIRING_MANAGER"])("strips public role selection: %s", (role) => {
    const parsed = registerCandidateSchema.safeParse({ body: { ...candidate, role } });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.body).not.toHaveProperty("role");
  });
  it("strips public tenant selection", () => {
    const parsed = registerCandidateSchema.safeParse({ body: { ...candidate, tenantId: "other-tenant" } });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.body).not.toHaveProperty("tenantId");
  });
  it("accepts legacy role and tenant fields without honoring them", async () => {
    const parsed = registerCandidateSchema.safeParse({ body: { ...candidate, role: "ADMIN", tenantId: "other-tenant" } });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const res = await run(parsed.data.body);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: "CANDIDATE", tenantId: "configured-tenant" }),
    }));
  });
  it("creates only a candidate in the configured tenant and returns inline enrollment", async () => {
    const res = await run();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.cookie).toHaveBeenCalledWith("temp_token", expect.any(String), expect.objectContaining({ httpOnly: true, maxAge: 300000 }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpSessionReady: true }));
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("qrCode");
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("otpAuthUrl");
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "CANDIDATE", tenantId: "configured-tenant", externalId: "identity-id" }) }));
    expect(prisma.tenants.create).not.toHaveBeenCalled();
  });
  it("keeps QR setup available when Keycloak cannot start the signup session", async () => {
    vi.mocked(axios.post).mockImplementation(async (url) => {
      if (String(url).includes("/protocol/openid-connect/token")) {
        throw new Error("temporary direct grant failure");
      }
      return { status: 204 } as never;
    });
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await run();

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpSessionReady: false }));
    logError.mockRestore();
  });
  it("does not create a tenant or user without configured tenant", async () => {
    vi.stubEnv("DEFAULT_TENANT_ID", "");
    expect((await run()).status).toHaveBeenCalledWith(503);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.tenants.create).not.toHaveBeenCalled();
  });
  it("rejects a nonexistent configured tenant", async () => {
    vi.mocked(prisma.tenants.findUnique).mockResolvedValue(null);
    expect((await run()).status).toHaveBeenCalledWith(503);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("fails closed when Keycloak is unavailable", async () => {
    vi.mocked(getAdminToken).mockRejectedValue(new Error("unavailable"));
    expect((await run()).status).toHaveBeenCalledWith(503);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
  it("does not persist an account after failed role mapping", async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error("mapping failed"));
    expect((await run()).status).toHaveBeenCalledWith(503);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
