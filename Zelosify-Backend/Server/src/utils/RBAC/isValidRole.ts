import { Role } from "@prisma/client";






export const isValidRole = (role: string): boolean => {
  return Object.values(Role).includes(role as Role);
};
