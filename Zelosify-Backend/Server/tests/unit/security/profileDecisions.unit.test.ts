import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../src/config/prisma/prisma.js";
import { decideProfile } from "../../../src/services/hiring/profileDecisionService.js";
const mocks = vi.hoisted(() => ({
  tx: { hiringProfile: { findFirst: vi.fn(), updateMany: vi.fn() }, decisionEmailOutbox: { create: vi.fn() } },
  schedule: vi.fn(),
}));
const tx = mocks.tx;
vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: { $transaction: vi.fn((callback) => callback(tx)) } }));
vi.mock("../../../src/services/notifications/decisionEmailOutbox.js", () => ({ scheduleDecisionEmailProcessing: mocks.schedule }));
const scope = { tenantId: "tenant-a", hiringManagerId: "manager-a" };
describe("Transactional profile decisions", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["other tenant", "other manager", "deleted profile", "unknown profile"])("denies inaccessible rows: %s", async () => {
    tx.hiringProfile.findFirst.mockResolvedValue(null);
    expect(await decideProfile(1, "manager-a", scope, "SHORTLISTED")).toEqual({ status: 404 });
    expect(tx.hiringProfile.findFirst).toHaveBeenCalledWith({ where: { id: 1, isDeleted: false, opening: { is: scope } } });
    expect(tx.hiringProfile.updateMany).not.toHaveBeenCalled();
  });
  it("preserves original actor and timestamp for a duplicate decision", async () => {
    const profile = { id: 1, status: "SHORTLISTED", shortlistedBy: "original", shortlistedAt: new Date(0) };
    tx.hiringProfile.findFirst.mockResolvedValue(profile);
    expect(await decideProfile(1, "manager-a", scope, "SHORTLISTED")).toEqual({ status: 200, profile, changed: false });
    expect(tx.hiringProfile.updateMany).not.toHaveBeenCalled();
    expect(tx.decisionEmailOutbox.create).not.toHaveBeenCalled();
  });
  it("rejects an opposite terminal transition", async () => {
    tx.hiringProfile.findFirst.mockResolvedValue({ status: "REJECTED" });
    expect(await decideProfile(1, "manager-a", scope, "SHORTLISTED")).toEqual({ status: 409 });
  });
  it("returns conflict after a concurrent decision/deletion wins", async () => {
    tx.hiringProfile.findFirst.mockResolvedValue({ status: "SUBMITTED" });
    tx.hiringProfile.updateMany.mockResolvedValue({ count: 0 });
    expect(await decideProfile(1, "manager-a", scope, "REJECTED")).toEqual({ status: 409 });
    expect(tx.hiringProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1, isDeleted: false, opening: { is: scope }, status: "SUBMITTED" } }));
  });
  it("records an authorized decision in a transaction", async () => {
    tx.hiringProfile.findFirst.mockResolvedValueOnce({ status: "SUBMITTED" }).mockResolvedValueOnce({ id: 1, status: "REJECTED" });
    tx.hiringProfile.updateMany.mockResolvedValue({ count: 1 });
    expect(await decideProfile(1, "manager-a", scope, "REJECTED")).toEqual({ status: 200, profile: { id: 1, status: "REJECTED" }, changed: true });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.hiringProfile.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rejectedBy: "manager-a", rejectedAt: expect.any(Date) }) }));
    expect(tx.decisionEmailOutbox.create).toHaveBeenCalledWith({ data: { applicationId: 1, decision: "REJECTED" } });
    expect(mocks.schedule).toHaveBeenCalledOnce();
  });

  it("queues a shortlist notification without repeating the decision", async () => {
    tx.hiringProfile.findFirst.mockResolvedValueOnce({ status: "SUBMITTED" }).mockResolvedValueOnce({ id: 1, status: "SHORTLISTED" });
    tx.hiringProfile.updateMany.mockResolvedValue({ count: 1 });

    const result = await decideProfile(1, "manager-a", scope, "SHORTLISTED");

    expect(result).toMatchObject({ status: 200, changed: true });
    expect(tx.decisionEmailOutbox.create).toHaveBeenCalledWith({ data: { applicationId: 1, decision: "SHORTLISTED" } });
  });
});
