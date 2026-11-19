import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import prisma from "../../../../src/config/prisma/prisma.js";
import QRCode from "qrcode";
import { getTOTPSetupQR } from "../../../../src/controllers/auth/local/login/setupTOTP.js";
import { generateTempToken } from "../../../../src/utils/jwt/generateTempToken.js";

vi.mock("../../../../src/config/prisma/prisma.js", () => ({
  default: { user: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr") } }));

const pendingUser = {
  id: "user-id",
  email: "user@example.test",
  totpSecret: "JBSWY3DPEHPK3PXP",
  totpVerifiedAt: null,
};

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
    cookie: vi.fn(),
  };
}

describe("TOTP setup QR endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "test-only-secret-32-characters-long");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(pendingUser as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it("requires the password-stage HttpOnly session cookie", async () => {
    const res = response();
    await getTOTPSetupQR({ cookies: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(QRCode.toDataURL).not.toHaveBeenCalled();
  });

  it("returns a no-store QR for pending setup without exposing the otpauth URL", async () => {
    const res = response();
    const token = generateTempToken(pendingUser.id, "test-refresh-token");
    await getTOTPSetupQR({ cookies: { temp_token: token } } as never, res as never);
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.json).toHaveBeenCalledWith({ qrCode: "data:image/png;base64,qr", replacement: false });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("otpAuthUrl");
  });

  it("creates a replacement QR after password verification without changing the active secret", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...pendingUser,
      totpVerifiedAt: new Date(),
    } as never);
    const res = response();
    await getTOTPSetupQR({ cookies: { temp_token: generateTempToken(pendingUser.id, "test-refresh-token") } } as never, res as never);
    expect(res.json).toHaveBeenCalledWith({ qrCode: "data:image/png;base64,qr", replacement: true });
    expect(res.cookie).toHaveBeenCalledWith("temp_token", expect.any(String), expect.objectContaining({ httpOnly: true, maxAge: 5 * 60 * 1000 }));
    const replacementToken = res.cookie.mock.calls[0][1];
    const decoded = jwt.verify(replacementToken, process.env.JWT_SECRET!, { algorithms: ["HS256"], audience: "zelosify-totp", issuer: "zelosify" }) as jwt.JwtPayload;
    expect(decoded.pendingTotpSecret).toEqual(expect.any(String));
    expect(decoded.refreshToken).toBe("test-refresh-token");
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(QRCode.toDataURL).toHaveBeenCalledTimes(1);
  });

  it("keeps the same proposed QR secret when the replacement request is retried", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...pendingUser, totpVerifiedAt: new Date() } as never);
    const proposedSecret = "JBSWY3DPEHPK3PXP";
    const res = response();
    const token = generateTempToken(pendingUser.id, "test-refresh-token", proposedSecret);

    await getTOTPSetupQR({ cookies: { temp_token: token } } as never, res as never);

    const renewedToken = res.cookie.mock.calls[0][1];
    const decoded = jwt.verify(renewedToken, process.env.JWT_SECRET!, { algorithms: ["HS256"], audience: "zelosify-totp", issuer: "zelosify" }) as jwt.JwtPayload;
    expect(decoded.pendingTotpSecret).toBe(proposedSecret);
    expect(res.json).toHaveBeenCalledWith({ qrCode: "data:image/png;base64,qr", replacement: true });
  });

  it("creates and persists a pending secret for accounts without one", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ ...pendingUser, totpSecret: null } as never)
      .mockImplementationOnce(async () => ({
        ...pendingUser,
        totpSecret: "JBSWY3DPEHPK3PXP",
      }) as never);
    const res = response();
    await getTOTPSetupQR({ cookies: { temp_token: generateTempToken(pendingUser.id, "test-refresh-token") } } as never, res as never);
    expect(prisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: pendingUser.id, totpSecret: null, totpVerifiedAt: null },
      data: { totpSecret: expect.any(String) },
    }));
    expect(res.json).toHaveBeenCalledWith({ qrCode: "data:image/png;base64,qr", replacement: false });
  });

  it("rejects a signed token with the wrong purpose", async () => {
    const wrongPurpose = jwt.sign({ userId: pendingUser.id, purpose: "access" }, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      audience: "zelosify-totp",
      issuer: "zelosify",
    });
    const res = response();
    await getTOTPSetupQR({ cookies: { temp_token: wrongPurpose } } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
