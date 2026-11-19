import { ProfileStatus, type Prisma } from "@prisma/client";
import prisma from "../../config/prisma/prisma.js";
import { scheduleDecisionEmailProcessing } from "../notifications/decisionEmailOutbox.js";

type Decision = typeof ProfileStatus.SHORTLISTED | typeof ProfileStatus.REJECTED;
export async function decideProfile(id: number, actorId: string, scope: Prisma.OpeningWhereInput, decision: Decision) {
  const result = await prisma.$transaction(async (tx) => {
    const where = { id, isDeleted: false, opening: { is: scope } };
    const existing = await tx.hiringProfile.findFirst({ where });
    if (!existing) return { status: 404 as const };
    // Retries preserve the original actor and timestamp; opposite terminal decisions conflict.
    if (existing.status === decision) return { status: 200 as const, profile: existing, changed: false };
    if (existing.status !== ProfileStatus.SUBMITTED) return { status: 409 as const };
    const now = new Date();
    const result = await tx.hiringProfile.updateMany({
      where: { ...where, status: ProfileStatus.SUBMITTED },
      data: decision === ProfileStatus.SHORTLISTED
        ? { status: decision, shortlistedBy: actorId, shortlistedAt: now, rejectedBy: null, rejectedAt: null }
        : { status: decision, rejectedBy: actorId, rejectedAt: now, shortlistedBy: null, shortlistedAt: null },
    });
    if (!result.count) return { status: 409 as const };
    const profile = await tx.hiringProfile.findFirst({ where });
    if (!profile) return { status: 409 as const };
    await tx.decisionEmailOutbox.create({ data: { applicationId: id, decision } });
    return { status: 200 as const, profile, changed: true };
  });
  if (result.status === 200) scheduleDecisionEmailProcessing();
  return result;
}
