import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("../../../src/config/env.js", () => ({ ENV: {
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: "mailer-user",
  SMTP_PASSWORD: "mailer-password",
  SMTP_FROM: "Zelosify Talent <no-reply@example.test>",
} }));

import { sendDecisionEmail } from "../../../src/services/notifications/decisionEmailMailer.js";

describe("SMTP decision email delivery", () => {
  beforeAll(() => mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail }));
  beforeEach(() => mocks.sendMail.mockReset().mockResolvedValue({ messageId: "test-message" }));

  it("creates a pooled SMTP transport and sends both text and HTML variants", async () => {
    const result = await sendDecisionEmail("candidate@example.com", {
      subject: "Application update",
      text: "Plain text",
      html: "<p>HTML</p>",
    });

    expect(result).toEqual({ status: "SENT" });
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.example.test",
      port: 587,
      secure: false,
      pool: true,
      auth: { user: "mailer-user", pass: "mailer-password" },
    }));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "candidate@example.com",
      subject: "Application update",
      text: "Plain text",
      html: "<p>HTML</p>",
    }));
  });

});
