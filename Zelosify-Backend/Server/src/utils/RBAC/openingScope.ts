import type { Prisma } from "@prisma/client";

type AuthenticatedUser = {
  id?: string;
  role?: string;
  tenantId?: string | null;
};

export function getOpeningScope(user?: AuthenticatedUser): Prisma.OpeningWhereInput | null {
  if (!user?.id || !user.tenantId) return null;

  if (user.role === "HIRING_MANAGER") {
    return { tenantId: user.tenantId, hiringManagerId: user.id };
  }

  if (user.role === "RECRUITER") {
    return { tenantId: user.tenantId, recruiterId: user.id };
  }

  if (user.role === "ADMIN") {
    return { tenantId: user.tenantId };
  }

  return null;
}
