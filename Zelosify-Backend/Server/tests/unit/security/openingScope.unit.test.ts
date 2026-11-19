import { describe, expect, it } from "vitest";
import { getOpeningScope } from "../../../src/utils/RBAC/openingScope.js";

describe("opening access scope", () => {
  it("limits hiring managers to their own tenant and openings", () => {
    expect(
      getOpeningScope({ id: "manager-1", role: "HIRING_MANAGER", tenantId: "tenant-1" }),
    ).toEqual({ tenantId: "tenant-1", hiringManagerId: "manager-1" });
  });

  it("limits admins to their tenant", () => {
    expect(getOpeningScope({ id: "user-1", role: "ADMIN", tenantId: "tenant-1" })).toEqual({
      tenantId: "tenant-1",
    });
  });

  it("limits recruiters to openings assigned to them in their tenant", () => {
    expect(getOpeningScope({ id: "recruiter-1", role: "RECRUITER", tenantId: "tenant-1" })).toEqual({
      tenantId: "tenant-1",
      recruiterId: "recruiter-1",
    });
  });

  it("does not expose vendor openings through the internal managed-opening scope", () => {
    expect(getOpeningScope({ id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-1" })).toBeNull();
  });

  it("denies accounts without a tenant or supported role", () => {
    expect(getOpeningScope({ id: "user-1", role: "RECRUITER" })).toBeNull();
    expect(getOpeningScope({ id: "user-1", role: "CANDIDATE", tenantId: "tenant-1" })).toBeNull();
    expect(getOpeningScope(undefined)).toBeNull();
  });
});
