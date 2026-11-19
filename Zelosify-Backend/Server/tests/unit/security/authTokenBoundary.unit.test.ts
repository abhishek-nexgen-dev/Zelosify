import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import axios from "axios";
import { authenticator } from "otplib";
import prisma from "../../../src/config/prisma/prisma.js";
import { generateTempToken } from "../../../src/utils/jwt/generateTempToken.js";
import { authenticateUser } from "../../../src/middlewares/auth/authenticateMiddleware.js";
import { verifyLogin } from "../../../src/controllers/auth/local/login/localLogin.js";
import { verifyTOTP } from "../../../src/controllers/auth/local/login/verifyTOTP.js";
vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: { user: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() } } }));
vi.mock("axios", () => ({ default: { post: vi.fn() } }));
vi.mock("../../../src/utils/keycloak/getKeycloakClientSecret.js", () => ({ getKeycloakClientSecret: vi.fn().mockResolvedValue("mock-secret") }));
const user = { id: "user-id", username: "user123", email: "user@example.test", provider: "KEYCLOAK", totpSecret: "mock-totp" };
function response() { return { status: vi.fn().mockReturnThis(), json: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn() }; }
describe("Authentication token boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("JWT_SECRET", "test-only-secret-32-characters-long"); vi.stubEnv("NODE_ENV", "development"); vi.mocked(prisma.user.findFirst).mockResolvedValue(user as never); vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never); vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never); });
  it("does not accept the pre-TOTP token as API authentication", async () => {
    const res = response(), next = vi.fn();
    await authenticateUser({ headers: { authorization: `Bearer ${generateTempToken(user.id, "mock-refresh")}` }, cookies: {} } as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled(); expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it("rejects a locally signed refresh token as API authentication", async () => {
    const res = response(), next = vi.fn();
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
    await authenticateUser({ headers: { authorization: `Bearer ${token}` }, cookies: {} } as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled();
  });
  it.each([new Error("offline"), { response: { status: 401 } }])("never bypasses password verification on provider failure", async (error) => {
    vi.mocked(axios.post).mockRejectedValue(error); const res = response();
    await verifyLogin({ body: { usernameOrEmail: user.email, password: "incorrect" } } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401); expect(res.cookie).not.toHaveBeenCalled();
  });
  it("resolves email case-insensitively and trims surrounding whitespace", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { refresh_token: "mock-refresh" } });
    const res = response();

    await verifyLogin({ body: { usernameOrEmail: "  USER@EXAMPLE.TEST  ", password: "valid" } } as never, res as never);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "user@example.test", mode: "insensitive" } },
      select: { id: true, username: true, email: true, provider: true, totpVerifiedAt: true },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpSetupRequired: true }));
  });
  it("uses the same canonical Keycloak username for email and username login", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { refresh_token: "mock-refresh" } });
    const res = response();

    await verifyLogin({ body: { usernameOrEmail: user.email, password: "valid" } } as never, res as never);

    const form = vi.mocked(axios.post).mock.calls[0]?.[1] as URLSearchParams;
    expect(form.get("username")).toBe(user.username);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpSetupRequired: true }));
  });
  it("logs only safe Keycloak failure metadata while keeping login errors generic", async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: {
        status: 401,
        data: { error: "invalid_grant", error_description: "sensitive provider detail" },
      },
    });
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const res = response();

    await verifyLogin({ body: { usernameOrEmail: user.email, password: "private-password" } } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials or identity service unavailable" });
    const diagnostic = String(log.mock.calls[0]?.[0]);
    expect(diagnostic).toContain('"event":"KEYCLOAK_PASSWORD_GRANT_FAILED"');
    expect(diagnostic).toContain('"providerErrorCode":"invalid_grant"');
    expect(diagnostic).toContain('"httpStatus":401');
    expect(diagnostic).not.toContain(user.email);
    expect(diagnostic).not.toContain("private-password");
    expect(diagnostic).not.toContain("sensitive provider detail");
    log.mockRestore();
  });
  it("marks accounts without a completed enrollment for setup after password verification", async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { access_token: "not-exposed", refresh_token: "mock-refresh" } }); const res = response();
    await verifyLogin({ body: { usernameOrEmail: user.email, password: "valid" } } as never, res as never);
    expect(res.cookie).toHaveBeenCalledTimes(1); expect(res.cookie.mock.calls[0][0]).toBe("temp_token");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpSetupRequired: true }));
  });
  it("requires a code instead of a QR for already-enrolled accounts", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ ...user, totpVerifiedAt: new Date() } as never);
    vi.mocked(axios.post).mockResolvedValue({ data: { access_token: "not-exposed", refresh_token: "mock-refresh" } });
    const res = response();
    await verifyLogin({ body: { usernameOrEmail: user.email, password: "valid" } } as never, res as never);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ totpSetupRequired: false }));
  });
  it("passes the password-stage temp cookie into the TOTP exchange", async () => {
    const totpSecret = authenticator.generateSecret();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, totpSecret } as never);
    vi.mocked(axios.post)
      .mockResolvedValueOnce({ data: { access_token: "keycloak-access", refresh_token: "mock-refresh" } })
      .mockResolvedValueOnce({ data: { access_token: "session-access", refresh_token: "session-refresh" } });
    const passwordResponse = response();
    await verifyLogin({ body: { usernameOrEmail: user.email, password: "valid" } } as never, passwordResponse as never);

    const [cookieName, tempToken, cookieOptions] = passwordResponse.cookie.mock.calls[0];
    expect(cookieName).toBe("temp_token");
    expect(cookieOptions).toMatchObject({ httpOnly: true, sameSite: "strict", maxAge: 5 * 60 * 1000, path: "/" });

    const totpResponse = response();
    await verifyTOTP({ body: { totp: authenticator.generate(totpSecret) }, cookies: { [cookieName]: tempToken } } as never, totpResponse as never);

    expect(totpResponse.json).toHaveBeenCalledWith(expect.objectContaining({ message: "TOTP verified successfully. Login successful." }));
    expect(totpResponse.clearCookie).toHaveBeenCalledWith("temp_token");
    expect(prisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: user.id, totpVerifiedAt: null, totpSecret },
      data: { totpVerifiedAt: expect.any(Date) },
    }));
    expect(totpResponse.cookie).toHaveBeenCalledWith("access_token", "session-access", expect.any(Object));
    expect(totpResponse.cookie).toHaveBeenCalledWith("refresh_token", "session-refresh", expect.any(Object));
  });
  it("accepts an adjacent-window Google Authenticator code without losing otplib plugins", async () => {
    const totpSecret = authenticator.generateSecret();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, totpSecret } as never);
    vi.mocked(axios.post).mockResolvedValue({ data: { access_token: "session-access", refresh_token: "session-refresh" } });
    const nextWindowEpoch = Math.floor(Date.now() / 30_000) * 30_000 + 30_000;
    const nextWindowCode = authenticator.create({
      ...authenticator.options,
      epoch: nextWindowEpoch,
    }).generate(totpSecret);
    const res = response();

    await verifyTOTP({
      body: { totp: nextWindowCode },
      cookies: { temp_token: generateTempToken(user.id, "mock-refresh") },
    } as never, res as never);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "TOTP verified successfully. Login successful." }));
  });
  it("activates a replacement authenticator only after its new code is verified", async () => {
    const currentSecret = authenticator.generateSecret();
    const replacementSecret = authenticator.generateSecret();
    const verifiedAt = new Date("2026-01-01T00:00:00.000Z");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, totpSecret: currentSecret, totpVerifiedAt: verifiedAt } as never);
    vi.mocked(axios.post).mockResolvedValue({ data: { access_token: "session-access", refresh_token: "session-refresh" } });
    const res = response();

    await verifyTOTP({
      body: { totp: authenticator.generate(replacementSecret) },
      cookies: { temp_token: generateTempToken(user.id, "mock-refresh", replacementSecret) },
    } as never, res as never);

    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: user.id, totpSecret: currentSecret, totpVerifiedAt: verifiedAt },
      data: { totpSecret: replacementSecret, totpVerifiedAt: expect.any(Date) },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "TOTP verified successfully. Login successful." }));
  });
  it("keeps the current authenticator active when the replacement code is invalid", async () => {
    const currentSecret = authenticator.generateSecret();
    const replacementSecret = authenticator.generateSecret();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, totpSecret: currentSecret, totpVerifiedAt: new Date() } as never);
    const res = response();
    const adjacentWindowVerifier = authenticator.create({ ...authenticator.options, window: 2 });
    const invalidCode = ["000000", "111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999"]
      .find((code) => !adjacentWindowVerifier.verify({ token: code, secret: currentSecret }) && !adjacentWindowVerifier.verify({ token: code, secret: replacementSecret }));
    expect(invalidCode).toBeDefined();

    await verifyTOTP({
      body: { totp: invalidCode },
      cookies: { temp_token: generateTempToken(user.id, "mock-refresh", replacementSecret) },
    } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
  it("lets the user sign in with the current authenticator without applying a replacement", async () => {
    const currentSecret = authenticator.generateSecret();
    let replacementSecret = authenticator.generateSecret();
    while (authenticator.generate(currentSecret) === authenticator.generate(replacementSecret)) {
      replacementSecret = authenticator.generateSecret();
    }
    const verifiedAt = new Date();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, totpSecret: currentSecret, totpVerifiedAt: verifiedAt } as never);
    vi.mocked(axios.post).mockResolvedValue({ data: { access_token: "session-access", refresh_token: "session-refresh" } });
    const res = response();

    await verifyTOTP({
      body: { totp: authenticator.generate(currentSecret) },
      cookies: { temp_token: generateTempToken(user.id, "mock-refresh", replacementSecret) },
    } as never, res as never);

    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "TOTP verified successfully. Login successful." }));
  });
  it("rejects a replacement when the current authenticator changed concurrently", async () => {
    const currentSecret = authenticator.generateSecret();
    const replacementSecret = authenticator.generateSecret();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, totpSecret: currentSecret, totpVerifiedAt: new Date() } as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 } as never);
    const res = response();

    await verifyTOTP({
      body: { totp: authenticator.generate(replacementSecret) },
      cookies: { temp_token: generateTempToken(user.id, "mock-refresh", replacementSecret) },
    } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(axios.post).not.toHaveBeenCalled();
  });
  it("rejects wrong-purpose tokens at TOTP exchange", async () => {
    const token = jwt.sign({ userId: user.id, refreshToken: "mock" }, process.env.JWT_SECRET!); const res = response();
    await verifyTOTP({ body: { totp: "123456" }, cookies: { temp_token: token } } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401); expect(res.cookie).not.toHaveBeenCalled();
  });
  it("does not mint a local session when refresh exchange fails", async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error("offline")); const res = response();
    await verifyTOTP({ body: { totp: "123456" }, cookies: { temp_token: generateTempToken(user.id, "mock-refresh") } } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401); expect(res.cookie).not.toHaveBeenCalled();
  });
});
