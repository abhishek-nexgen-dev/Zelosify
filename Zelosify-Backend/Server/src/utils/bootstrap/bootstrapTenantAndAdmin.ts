import prisma from "../../config/prisma/prisma.js";
import { Role, AuthProvider } from "@prisma/client";
import { getAdminToken } from "../keycloak/getAdminToken.js";
import { createKeycloakUser } from "../keycloak/createKeycloakUser.js";
import axios from "axios";
import { ENV } from "../../constants/env.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../RBAC/permissions.js";

const KEYCLOAK_URL = ENV.KEYCLOAK_URL;
const REALM_NAME = ENV.KEYCLOAK_REALM;

export async function bootstrapTenantAndAdmin() {
  try {
    const tenantId = (ENV.DEFAULT_TENANT_ID || ENV.TENANT_ID || "8dc0e05b-2956-4d74-b0e9-5aea5ab3b748").trim();
    const companyName = (ENV.DEFAULT_TENANT_NAME || "Bruce Wayne Corp").trim();

    const adminUsername = (ENV.DEFAULT_ADMIN_USERNAME || "admin").trim();
    const adminEmail = (ENV.DEFAULT_ADMIN_EMAIL || "admin@zelosify.com").trim();
    const adminPassword = (ENV.DEFAULT_ADMIN_PASSWORD || "Admin@1234").trim();
    const adminFirstName = (ENV.DEFAULT_ADMIN_FIRST_NAME || "System").trim();
    const adminLastName = (ENV.DEFAULT_ADMIN_LAST_NAME || "Admin").trim();

    // 1. Ensure the single configured tenant exists in database
    let tenant = await prisma.tenants.findUnique({
      where: { tenantId },
    });

    if (!tenant) {
      tenant = await prisma.tenants.create({
        data: {
          tenantId,
          companyName,
        },
      });
      console.log(`✅ [Bootstrap] Created default tenant from .env: "${tenant.companyName}" (${tenant.tenantId})`);
    } else {
      console.log(`✅ [Bootstrap] Verified tenant from .env: "${tenant.companyName}" (${tenant.tenantId})`);
    }

    // 2. Ensure default Admin user exists in Keycloak (if reachable)
    let externalId: string | null = null;
    try {
      const adminToken = await getAdminToken();
      if (adminToken) {
        const searchRes = await axios.get(
          `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users?username=${encodeURIComponent(adminUsername)}&exact=true`,
          { headers: { Authorization: `Bearer ${adminToken}` }, timeout: 4000 }
        );

        if (Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          externalId = searchRes.data[0].id;
        } else {
          const createRes = await createKeycloakUser(adminToken, {
            username: adminUsername,
            email: adminEmail,
            firstName: adminFirstName,
            lastName: adminLastName,
            credentials: [{ type: "password", value: adminPassword, temporary: false }],
          });
          externalId = createRes?.id || null;
        }

        // Map ADMIN realm role
        if (externalId) {
          try {
            const roleRes = await axios.get(
              `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/roles/ADMIN`,
              { headers: { Authorization: `Bearer ${adminToken}` }, timeout: 4000 }
            );
            if (roleRes.data?.id) {
              await axios.post(
                `${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/users/${externalId}/role-mappings/realm`,
                [roleRes.data],
                { headers: { Authorization: `Bearer ${adminToken}` }, timeout: 4000 }
              );
            }
          } catch {
            // Role may already be mapped
          }
        }
      }
    } catch (kcErr) {
      console.warn("⚠️ [Bootstrap] Keycloak not reachable for admin check; proceeding with local database bootstrap.");
    }

    // 3. Ensure default Admin user exists in PostgreSQL
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [{ username: adminUsername }, { email: adminEmail }],
      },
    });

    if (!existingAdmin) {
      const newAdmin = await prisma.user.create({
        data: {
          username: adminUsername,
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
          role: Role.ADMIN,
          permissions: [...DEFAULT_ROLE_PERMISSIONS.ADMIN],
          department: "Executive & IT",
          tenantId: tenant.tenantId,
          externalId: externalId || "admin-user-uuid-001",
          totpSecret: "A56UIBIYOICB4DQA", // Preconfigured static base32 TOTP secret for default admin
          provider: AuthProvider.KEYCLOAK,
          creator: "bootstrap",
        },
      });
      console.log(`✅ [Bootstrap] Created default admin user from .env: "${newAdmin.username}" (${newAdmin.email})`);
    } else {
      // Keep admin credentials, role, and tenant synchronized
      if (
        existingAdmin.role !== Role.ADMIN ||
        existingAdmin.tenantId !== tenant.tenantId ||
        (externalId && existingAdmin.externalId !== externalId) ||
        !DEFAULT_ROLE_PERMISSIONS.ADMIN.every((permission) => existingAdmin.permissions.includes(permission))
      ) {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: {
            role: Role.ADMIN,
            tenantId: tenant.tenantId,
            permissions: [...DEFAULT_ROLE_PERMISSIONS.ADMIN],
            ...(externalId ? { externalId } : {}),
          },
        });
      }
      console.log(`✅ [Bootstrap] Verified admin user from .env: "${existingAdmin.username}" (${existingAdmin.email})`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const safeMessage = message.replace(/(postgres(?:ql)?:\/\/)[^@/\s]+@/gi, "$1[redacted]@");
    console.error(JSON.stringify({
      level: "error",
      event: "TENANT_ADMIN_BOOTSTRAP_FAILED",
      error: safeMessage,
    }));
    throw err;
  }
}
