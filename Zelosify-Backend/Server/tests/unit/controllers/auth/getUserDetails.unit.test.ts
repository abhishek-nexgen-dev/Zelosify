import { describe, expect, it, vi } from "vitest";
import { getUserDetails } from "../../../../src/controllers/auth/user/getUserDetails.js";
import type { AuthenticatedRequest } from "../../../../src/types/common.js";

describe("GET /auth/user controller", () => {
  it("returns the authenticated user without performing a duplicate database lookup", async () => {
    const user = {
      id: "user-1",
      username: "candidate",
      email: "candidate@example.com",
      firstName: "Sam",
      lastName: "Candidate",
      role: "CANDIDATE",
      permissions: [],
      department: "Talent",
      provider: "KEYCLOAK",
      tenantId: "tenant-1",
      tenant: { tenantId: "tenant-1", companyName: "Example Corp" },
    };
    const request = { user } as unknown as AuthenticatedRequest;
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getUserDetails(request, response as never);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      id: "user-1",
      username: "candidate",
      email: "candidate@example.com",
      firstName: "Sam",
      lastName: "Candidate",
      role: "CANDIDATE",
      permissions: [],
      department: "Talent",
      tenant: { tenantId: "tenant-1", companyName: "Example Corp" },
    });
  });

  it("returns 401 when authentication did not attach a user", async () => {
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getUserDetails({} as AuthenticatedRequest, response as never);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ message: "User not found" });
  });
});
