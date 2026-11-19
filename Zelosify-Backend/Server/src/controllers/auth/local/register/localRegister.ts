import { Request, Response } from "express";
import asyncHandler from "../../../../utils/handler/asyncHandler.js";
import { RegisterRequest, RegisterResponse } from "../../../../types/auth.js";
import prisma from "../../../../config/prisma/prisma.js";
import { getAdminToken } from "../../../../utils/keycloak/getAdminToken.js";
import { authenticator } from "otplib";
import { createKeycloakUser } from "../../../../utils/keycloak/createKeycloakUser.js";
import axios from "axios";
import { AuthProvider, Role } from "@prisma/client";
import { ENV } from "../../../../constants/env.js";
import { getKeycloakClientSecret } from "../../../../utils/keycloak/getKeycloakClientSecret.js";
import { generateTempToken } from "../../../../utils/jwt/generateTempToken.js";

const KEYCLOAK_URL = ENV.KEYCLOAK_URL;
const REALM_NAME = ENV.KEYCLOAK_REALM;
const APP_ROLE_NAMES = new Set(["ADMIN", "RECRUITER", "HIRING_MANAGER", "CANDIDATE", "IT_VENDOR"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return isRecord(error) && error.code === "P2002";
}

function getHttpFailure(error: unknown): { status?: number; code?: string; responseData?: unknown } {
  if (!isRecord(error)) return {};
  const response = isRecord(error.response) ? error.response : undefined;
  return {
    ...(typeof response?.status === "number" ? { status: response.status } : {}),
    ...(typeof error.code === "string" ? { code: error.code } : {}),
    ...(response ? { responseData: response.data } : {}),
  };
}

async function findReusableCandidateIdentity(
  adminToken: string,
  username: string,
  email: string,
  password: string,
): Promise<string | null> {
  const usersResponse = await axios.get(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
      params: { username, exact: true },
      timeout: 5000,
    },
  );
  const users: unknown = usersResponse.data;
  if (!Array.isArray(users)) throw new Error("Keycloak user search returned an invalid response");

  const identity = users.find((value: unknown) => {
    if (!isRecord(value)) return false;
    return typeof value.username === "string" &&
      value.username.toLowerCase() === username.toLowerCase();
  });
  if (!isRecord(identity) || typeof identity.id !== "string" || identity.enabled !== true ||
      typeof identity.email !== "string" || identity.email.toLowerCase() !== email.toLowerCase() ||
      typeof identity.username !== "string") {
    return null;
  }

  const rolesResponse = await axios.get(
    `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${encodeURIComponent(identity.id)}/role-mappings/realm`,
    { headers: { Authorization: `Bearer ${adminToken}` }, timeout: 5000 },
  );
  const assignedRoles: unknown = rolesResponse.data;
  if (!Array.isArray(assignedRoles)) throw new Error("Keycloak role lookup returned an invalid response");
  const appRoles = assignedRoles
    .filter((value: unknown): value is Record<string, unknown> => isRecord(value))
    .map((role) => role.name)
    .filter((role): role is string => typeof role === "string" && APP_ROLE_NAMES.has(role));
  if (appRoles.some((role) => role !== Role.CANDIDATE)) return null;

  const clientSecret = await getKeycloakClientSecret();
  try {
    const tokenResponse = await axios.post(
      `${KEYCLOAK_URL}/realms/${REALM_NAME}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "password",
        client_id: ENV.KEYCLOAK_CLIENT_ID,
        client_secret: clientSecret,
        username: identity.username,
        password,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 },
    );
    const tokens: unknown = tokenResponse.data;
    return isRecord(tokens) && typeof tokens.access_token === "string" ? identity.id : null;
  } catch (error: unknown) {
    const failure = getHttpFailure(error);
    if (failure.status === 400 && isRecord(failure.responseData) && failure.responseData.error === "invalid_grant") {
      return null;
    }
    throw error;
  }
}

async function removeProvisionedIdentity(adminToken: string, identityId: string): Promise<void> {
  try {
    await axios.delete(
      `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${encodeURIComponent(identityId)}`,
      { headers: { Authorization: `Bearer ${adminToken}` }, timeout: 5000 },
    );
  } catch (error: unknown) {
    const { status: httpStatus, code: errorCode } = getHttpFailure(error);
    console.error(JSON.stringify({
      level: "error",
      event: "KEYCLOAK_REGISTRATION_ROLLBACK_FAILED",
      ...(httpStatus ? { httpStatus } : {}),
      ...(errorCode ? { errorCode } : {}),
    }));
  }
}

export const register = asyncHandler(
  async (req: Request<{}, any, RegisterRequest>, res: Response) => {
    let identityAdminToken: string | undefined;
    let newlyCreatedIdentityId: string | undefined;
    try {
      const {
        username,
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        department,
      } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({ error: "Username, email, and password are required." });
        return;
      }

      // Check for duplicate username or email
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] },
      });
      if (existingUser) {
        res.status(409).json({ message: "An account with these details already exists. Please sign in." });
        return;
      }

      const resolvedRole = Role.CANDIDATE;

      const resolvedDepartment = department || "Sales";
      const resolvedFirstName = firstName || username;
      const resolvedLastName = lastName || "";
      const resolvedPhoneNumber = phoneNumber || "";

      const configuredTenantId = (ENV.DEFAULT_TENANT_ID || ENV.TENANT_ID)?.trim();
      if (!configuredTenantId) {
        res.status(503).json({ message: "Candidate registration is not configured." });
        return;
      }
      const resolvedTenantId = configuredTenantId;
      const tenant = await prisma.tenants.findUnique({ where: { tenantId: resolvedTenantId } });
      if (!tenant) {
        res.status(503).json({ message: "Candidate registration is not configured." });
        return;
      }

      // Generate TOTP Secret and URLs
      const totpSecret = authenticator.generateSecret();

      let externalId: string;
      let identityStage = "admin_token";
      try {
        const adminToken = await getAdminToken();
        identityAdminToken = adminToken;
        identityStage = "create_user";
        try {
          const identity = await createKeycloakUser(adminToken, {
            username, email, firstName: resolvedFirstName, lastName: resolvedLastName,
            credentials: [{ type: "password", value: password, temporary: false }],
          });
          if (!identity.id) throw new Error("Identity provider returned no user identifier");
          externalId = identity.id;
          newlyCreatedIdentityId = identity.id;
        } catch (error: unknown) {
          if (getHttpFailure(error).status !== 409) throw error;
          identityStage = "recover_existing_candidate";
          const reusableIdentityId = await findReusableCandidateIdentity(
            adminToken, username, email, password,
          );
          if (!reusableIdentityId) {
            res.status(409).json({
              message: "An account with these details already exists. Sign in or contact your administrator.",
            });
            return;
          }
          externalId = reusableIdentityId;
        }

        identityStage = "lookup_role";
        const roleResponse = await axios.get(
          `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles/${Role.CANDIDATE}`,
          { headers: { Authorization: `Bearer ${adminToken}` }, timeout: 5000 },
        );
        if (typeof roleResponse.data?.id !== "string") throw new Error("Role is unavailable");
        identityStage = "assign_role";
        await axios.post(
          `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${externalId}/role-mappings/realm`,
          [roleResponse.data],
          { headers: { Authorization: `Bearer ${adminToken}` }, timeout: 5000 },
        );
      } catch (error: unknown) {
        if (newlyCreatedIdentityId && identityAdminToken) {
          await removeProvisionedIdentity(identityAdminToken, newlyCreatedIdentityId);
          newlyCreatedIdentityId = undefined;
        }
        const { status: httpStatus, code: errorCode } = getHttpFailure(error);
        console.error(JSON.stringify({
          level: "error",
          event: "KEYCLOAK_REGISTRATION_FAILED",
          stage: identityStage,
          ...(httpStatus ? { httpStatus } : {}),
          ...(errorCode ? { errorCode } : {}),
        }));
        res.status(503).json({ message: "Registration identity service is unavailable." });
        return;
      }

      // Persist User in PostgreSQL database
      const user = await prisma.user.create({
        data: {
          username,
          email,
          firstName: resolvedFirstName,
          lastName: resolvedLastName,
          phoneNumber: resolvedPhoneNumber,
          department: resolvedDepartment,
          role: resolvedRole,
          tenantId: tenant.tenantId,
          externalId,
          totpSecret,
          provider: AuthProvider.KEYCLOAK,
          creator: username,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          department: true,
          role: true,
          tenantId: true,
          provider: true,
        },
      });
      newlyCreatedIdentityId = undefined;

      // Let the new user verify the enrollment code immediately without signing in again.
      let totpSessionReady = false;
      try {
        const clientSecret = await getKeycloakClientSecret();
        const tokenResponse = await axios.post(
          `${KEYCLOAK_URL}/realms/${REALM_NAME}/protocol/openid-connect/token`,
          new URLSearchParams({
            grant_type: "password",
            client_id: ENV.KEYCLOAK_CLIENT_ID,
            client_secret: clientSecret,
            username: email,
            password,
          }),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 },
        );
        const refreshToken: unknown = tokenResponse.data?.refresh_token;
        if (typeof refreshToken !== "string" || !refreshToken) {
          throw new Error("Identity provider returned no refresh token");
        }
        res.cookie("temp_token", generateTempToken(user.id, refreshToken), {
          httpOnly: true,
          secure: ENV.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 5 * 60 * 1000,
          path: "/",
        });
        totpSessionReady = true;
      } catch (error) {
        // The account and QR remain available; the UI falls back to the normal sign-in flow.
        console.error(
          "[Auth] Signup TOTP session setup failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }

      // Expected response matching API documentation and Postman guide
      const response: RegisterResponse = {
        message:
          "User registered successfully. Continue to configure TOTP.",
        user: {
          id: user.id,
          username: user.username || "",
          email: user.email,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          phoneNumber: user.phoneNumber || "",
          department: user.department || "",
          role: user.role,
          tenantId: user.tenantId || "",
          provider: user.provider,
        },
        totpSessionReady,
        expiresIn: 300,
      };

      res.status(201).json(response);
    } catch (error: unknown) {
      if (newlyCreatedIdentityId && identityAdminToken && !isPrismaUniqueConstraintError(error)) {
        await removeProvisionedIdentity(identityAdminToken, newlyCreatedIdentityId);
      }
      if (isPrismaUniqueConstraintError(error)) {
        res.status(409).json({ message: "An account with these details already exists. Please sign in." });
        return;
      }
      const errorCode = isRecord(error) && typeof error.code === "string" ? error.code : undefined;
      console.error(JSON.stringify({
        level: "error",
        event: "REGISTRATION_PERSISTENCE_FAILED",
        ...(errorCode ? { errorCode } : {}),
      }));
      res.status(500).json({ message: "Error registering user" });
    }
  }
);
