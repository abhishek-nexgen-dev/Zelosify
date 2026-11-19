
CREATE TYPE "AuthProvider" AS ENUM ('KEYCLOAK', 'GOOGLE', 'MICROSOFT');


CREATE TYPE "Role" AS ENUM ('ADMIN', 'BUSINESS_APPROVER', 'BUSINESS_USER', 'FINANCE_MANAGER', 'HIRING_MANAGER', 'IT_VENDOR', 'PROCUREMENT_MANAGER', 'RESOURCE_MANAGER', 'VENDOR_MANAGER');


CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "department" TEXT,
    "role" "Role" NOT NULL,
    "tenantId" TEXT,
    "externalId" TEXT,
    "totpSecret" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "provider" "AuthProvider" NOT NULL DEFAULT 'KEYCLOAK',
    "creator" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Tenants" (
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'DemoTenant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenants_pkey" PRIMARY KEY ("tenantId")
);


CREATE UNIQUE INDEX "User_username_key" ON "User"("username");


CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");


CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");


CREATE UNIQUE INDEX "User_email_provider_key" ON "User"("email", "provider");


ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenants"("tenantId") ON DELETE SET NULL ON UPDATE CASCADE;
