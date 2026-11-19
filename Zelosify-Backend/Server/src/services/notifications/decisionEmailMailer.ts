import nodemailer, { type Transporter } from "nodemailer";
import { ENV } from "../../config/env.js";
import type { CandidateDecisionEmail } from "./candidateDecisionEmailTemplates.js";

export type DecisionEmailDelivery =
  | { status: "SENT" }
  | { status: "NOT_CONFIGURED" }
  | { status: "FAILED"; errorCode: string };

let transporter: Transporter | undefined;

export function isDecisionEmailConfigured(): boolean {
  const hasUser = Boolean(ENV.SMTP_USER);
  const hasPassword = Boolean(ENV.SMTP_PASSWORD);
  return Boolean(ENV.SMTP_HOST && ENV.SMTP_FROM && hasUser === hasPassword);
}

function getTransporter(): Transporter | null {
  const hasUser = Boolean(ENV.SMTP_USER);
  const hasPassword = Boolean(ENV.SMTP_PASSWORD);
  if (!isDecisionEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      pool: true,
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      ...(hasUser && hasPassword ? { auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASSWORD } } : {}),
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      maxConnections: 1,
      maxMessages: 100,
    });
  }
  return transporter;
}

function safeErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && /^[A-Z0-9_-]{1,40}$/i.test(error.code)) {
    return error.code.toUpperCase();
  }
  if (typeof error === "object" && error !== null && "responseCode" in error && typeof error.responseCode === "number") {
    return `SMTP_${error.responseCode}`;
  }
  return "SMTP_SEND_FAILED";
}

export async function sendDecisionEmail(recipient: string, email: CandidateDecisionEmail): Promise<DecisionEmailDelivery> {
  const client = getTransporter();
  if (!client) return { status: "NOT_CONFIGURED" };
  try {
    await client.sendMail({
      from: ENV.SMTP_FROM,
      to: recipient,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    return { status: "SENT" };
  } catch (error) {
    return { status: "FAILED", errorCode: safeErrorCode(error) };
  }
}
