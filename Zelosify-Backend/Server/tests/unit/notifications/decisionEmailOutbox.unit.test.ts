import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    decisionEmailOutbox: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    hiringProfile: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
  sendDecisionEmail: vi.fn(),
  isDecisionEmailConfigured: vi.fn(),
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/config/env.js", () => ({ ENV: { DECISION_EMAIL_WORKER_INTERVAL_MS: 10000 } }));
vi.mock("../../../src/services/notifications/decisionEmailMailer.js", () => ({
  sendDecisionEmail: mocks.sendDecisionEmail,
  isDecisionEmailConfigured: mocks.isDecisionEmailConfigured,
}));

import { processPendingDecisionEmails } from "../../../src/services/notifications/decisionEmailOutbox.js";

describe("candidate decision email outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDecisionEmailConfigured.mockReturnValue(true);
    mocks.prisma.decisionEmailOutbox.findMany.mockResolvedValue([
      { id: "queue-1", applicationId: 42, decision: "SHORTLISTED", attemptCount: 0 },
    ]);
    mocks.prisma.decisionEmailOutbox.updateMany.mockResolvedValue({ count: 1 });
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue({
      uploadedBy: "candidate-1",
      opening: { title: "Senior Engineer", tenant: { companyName: "Example Corp" } },
    });
    mocks.prisma.user.findUnique.mockResolvedValue({ email: "candidate@example.com", firstName: "Sam", lastName: "Candidate" });
    mocks.prisma.decisionEmailOutbox.update.mockResolvedValue({});
    mocks.sendDecisionEmail.mockResolvedValue({ status: "SENT" });
  });

  it("claims and sends a queued decision email, then marks it sent", async () => {
    await processPendingDecisionEmails();

    expect(mocks.prisma.decisionEmailOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "queue-1" }),
      data: expect.objectContaining({ status: "PROCESSING", attemptCount: { increment: 1 } }),
    }));
    expect(mocks.sendDecisionEmail).toHaveBeenCalledWith("candidate@example.com", expect.objectContaining({
      subject: expect.stringContaining("shortlisted"),
      text: expect.stringContaining("Senior Engineer"),
    }));
    expect(mocks.prisma.decisionEmailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "queue-1" },
      data: expect.objectContaining({ status: "SENT", sentAt: expect.any(Date) }),
    }));
  });

  it("sends the rejection template for a queued rejected application", async () => {
    mocks.prisma.decisionEmailOutbox.findMany.mockResolvedValueOnce([
      { id: "queue-rejected", applicationId: 43, decision: "REJECTED", attemptCount: 0 },
    ]);

    await processPendingDecisionEmails();

    expect(mocks.sendDecisionEmail).toHaveBeenCalledWith("candidate@example.com", expect.objectContaining({
      subject: expect.stringContaining("application"),
      text: expect.stringContaining("decided not to move forward"),
    }));
    expect(mocks.prisma.decisionEmailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "queue-rejected" },
      data: expect.objectContaining({ status: "SENT", sentAt: expect.any(Date) }),
    }));
  });

  it("retries an SMTP failure without exposing recipient details", async () => {
    mocks.sendDecisionEmail.mockResolvedValue({ status: "FAILED", errorCode: "ECONNECTION" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await processPendingDecisionEmails();

    expect(mocks.prisma.decisionEmailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PENDING", attemptCount: 1, lastErrorCode: "ECONNECTION" }),
    }));
    expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("candidate@example.com");
    errorSpy.mockRestore();
  });

  it("skips mail for profiles that are no longer active in the recorded decision state", async () => {
    mocks.prisma.hiringProfile.findFirst.mockResolvedValue(null);

    await processPendingDecisionEmails();

    expect(mocks.sendDecisionEmail).not.toHaveBeenCalled();
    expect(mocks.prisma.decisionEmailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "SKIPPED", lastErrorCode: "APPLICATION_NOT_ACTIVE" }),
    }));
  });

  it("leaves queued notifications untouched until SMTP is configured", async () => {
    mocks.isDecisionEmailConfigured.mockReturnValue(false);

    await processPendingDecisionEmails();

    expect(mocks.prisma.decisionEmailOutbox.findMany).not.toHaveBeenCalled();
    expect(mocks.sendDecisionEmail).not.toHaveBeenCalled();
  });
});
