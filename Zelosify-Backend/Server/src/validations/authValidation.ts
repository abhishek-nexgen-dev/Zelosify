import { z } from "zod";
import { APP_PERMISSIONS } from "../utils/RBAC/permissions.js";




export const registerCandidateSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username cannot exceed 50 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1, "First name is required").optional(),
    lastName: z.string().min(1, "Last name is required").optional(),
    phoneNumber: z.string().optional(),
    department: z.string().optional(),
  }).strip(),
});

// Keep the legacy /register route candidate-only too. Role and tenant fields are
// stripped from legacy clients and are always assigned by the server.
export const registerUserSchema = registerCandidateSchema;

export const createTeamMemberSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username cannot exceed 50 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain alphanumeric characters, underscores, and hyphens"),
    email: z.string().email("Invalid recruiter email address"),
    password: z.string().min(12, "Temporary password must be at least 12 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    department: z.string().default("Talent Acquisition"),
    role: z.enum(["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"]).default("RECRUITER"),
  }),
});
// Keep the old export name for any existing internal callers.
export const assignRecruiterSchema = createTeamMemberSchema;

export const listRecruitersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    role: z.enum(["RECRUITER", "HIRING_MANAGER", "IT_VENDOR"]).optional(),
  }),
});

const permissionTargetRoles = ["IT_VENDOR", "HIRING_MANAGER", "RECRUITER"] as const;
const teamUserId = z.string().trim().min(1, "User ID is required").max(128, "User ID is too long");

export const listPermissionTargetsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    role: z.enum(permissionTargetRoles).optional(),
  }),
});

export const teamPermissionParamsSchema = z.object({
  params: z.object({ id: teamUserId }),
});

export const addTeamPermissionSchema = z.object({
  params: z.object({ id: teamUserId }),
  body: z.object({ permission: z.enum(APP_PERMISSIONS) }),
});

export const removeTeamPermissionSchema = z.object({
  params: z.object({
    id: teamUserId,
    permission: z.enum(APP_PERMISSIONS),
  }),
});

export const updateUserPermissionsSchema = z.object({
  params: z.object({ id: teamUserId }),
  body: z.object({
    permissions: z.array(z.enum(APP_PERMISSIONS)).max(APP_PERMISSIONS.length)
      .refine((permissions) => new Set(permissions).size === permissions.length, "Permissions must not contain duplicates"),
  }),
});

export const teamMemberParamsSchema = z.object({
  params: z.object({ id: teamUserId }),
});




export const loginSchema = z.object({
  body: z.object({
    usernameOrEmail: z.string().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required"),
  }),
});




export const verifyTotpSchema = z.object({
  body: z.object({
    totp: z
      .string()
      .trim()
      .length(6, "TOTP code must be exactly 6 digits")
      .regex(/^\d{6}$/, "TOTP code must contain only numbers"),
  }),
});

export type RegisterCandidateInput = z.infer<typeof registerCandidateSchema>["body"];
export type RegisterUserInput = RegisterCandidateInput;
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>["body"];
export type AssignRecruiterInput = CreateTeamMemberInput;
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type VerifyTotpInput = z.infer<typeof verifyTotpSchema>["body"];
