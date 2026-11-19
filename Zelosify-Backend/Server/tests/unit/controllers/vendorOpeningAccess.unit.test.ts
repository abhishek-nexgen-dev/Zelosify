import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, storageMock, triggerRecommendationMock } = vi.hoisted(() => ({
  prismaMock: {
    opening: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    user: { findMany: vi.fn(), findFirst: vi.fn() },
    hiringProfile: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  storageMock: {
    getUploadURL: vi.fn(),
    getObjectMetadata: vi.fn(),
    getObjectStream: vi.fn(),
    getObjectURL: vi.fn(),
  },
  triggerRecommendationMock: vi.fn(),
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: prismaMock }));
vi.mock("../../../src/config/env.js", () => ({ ENV: {
  DEFAULT_PAGE_LIMIT: 20,
  MAX_PAGE_LIMIT: 100,
  DEFAULT_TENANT_NAME: "Example Tenant",
  DEFAULT_HIRING_MANAGER_NAME: "Hiring Team",
} }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({ createStorageService: () => storageMock }));
vi.mock("../../../src/services/storage/storageService.js", () => ({ getSignedUrlExpirySeconds: () => 300 }));
vi.mock("../../../src/services/ai/recommendationService.js", () => ({ triggerAsyncRecommendation: triggerRecommendationMock }));

import {
  getVendorOpenings,
  getVendorOpeningDetail,
  presignVendorProfileUpload,
  submitVendorProfiles,
  previewVendorProfile,
  softDeleteVendorProfile,
} from "../../../src/controllers/vendor/contractOpeningsController.js";

function responseMock() {
  const response: any = {};
  response.status = vi.fn().mockReturnValue(response);
  response.json = vi.fn().mockReturnValue(response);
  return response;
}

const vendorRequest = {
  user: { id: "vendor-1", role: "IT_VENDOR", tenantId: "tenant-1", permissions: [
    "JOBS_VIEW", "VENDOR_PROFILES_VIEW", "VENDOR_PROFILES_SUBMIT", "VENDOR_PROFILES_DELETE",
  ] },
};

describe("IT Vendor opening and profile isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.opening.count.mockResolvedValue(1);
    prismaMock.opening.findMany.mockResolvedValue([{
      id: "opening-1", tenantId: "tenant-1", title: "Platform Engineer", status: "OPEN",
      hiringManagerId: "manager-1", tenant: { companyName: "Example Tenant" },
    }]);
    prismaMock.opening.findFirst.mockResolvedValue({
      id: "opening-1", tenantId: "tenant-1", title: "Platform Engineer", status: "OPEN",
      hiringManagerId: "manager-1", tenant: { companyName: "Example Tenant" },
    });
    prismaMock.user.findMany.mockResolvedValue([{ id: "manager-1", firstName: "Hiring", lastName: "Manager" }]);
    prismaMock.user.findFirst.mockResolvedValue({ firstName: "Hiring", lastName: "Manager" });
    prismaMock.hiringProfile.findMany.mockResolvedValue([{
      id: 7, uploadedBy: "vendor-1", s3Key: "tenant-1/opening-1/vendor-1/resume.pdf",
      submittedAt: new Date("2026-11-18T00:00:00Z"), status: "SUBMITTED",
    }]);
  });

  it("lists only open openings in the authenticated tenant and includes the manager name", async () => {
    const res = responseMock();
    await getVendorOpenings({ ...vendorRequest, query: { page: "2", limit: "5" } } as any, res);

    expect(prismaMock.opening.count).toHaveBeenCalledWith({ where: { tenantId: "tenant-1", status: "OPEN" } });
    expect(prismaMock.opening.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: "tenant-1", status: "OPEN" }, skip: 5, take: 5,
    }));
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["manager-1"] }, tenantId: "tenant-1" },
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ hiringManagerName: "Hiring Manager" })],
      pagination: expect.objectContaining({ page: 2, limit: 5 }),
    }));
  });

  it("rejects malformed pagination before querying the database", async () => {
    const res = responseMock();
    await getVendorOpenings({ ...vendorRequest, query: { page: "2abc", limit: "100000000000000000000" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prismaMock.opening.count).not.toHaveBeenCalled();
    expect(prismaMock.opening.findMany).not.toHaveBeenCalled();
  });

  it("returns only the authenticated vendor's active profiles and omits AI results", async () => {
    const res = responseMock();
    await getVendorOpeningDetail({ ...vendorRequest, params: { id: "opening-1" } } as any, res);

    expect(prismaMock.opening.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "opening-1", tenantId: "tenant-1" },
    }));
    expect(prismaMock.hiringProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { openingId: "opening-1", uploadedBy: "vendor-1", isDeleted: false },
    }));
    const response = res.json.mock.calls[0][0].data;
    expect(response.hiringManagerName).toBe("Hiring Manager");
    expect(response.profilesCount).toBe(1);
    expect(response.profiles[0]).not.toHaveProperty("recommendationScore");
    expect(response.profiles[0]).not.toHaveProperty("recommendationReason");
  });

  it("denies cross-tenant openings before reading any vendor profiles", async () => {
    prismaMock.opening.findFirst.mockResolvedValueOnce(null);
    const res = responseMock();
    await getVendorOpeningDetail({ ...vendorRequest, params: { id: "other-tenant-opening" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(prismaMock.hiringProfile.findMany).not.toHaveBeenCalled();
  });

  it("does not issue an upload URL for an opening outside the authenticated tenant", async () => {
    prismaMock.opening.findFirst.mockResolvedValueOnce(null);
    const res = responseMock();
    await presignVendorProfileUpload({
      ...vendorRequest,
      params: { id: "other-tenant-opening" },
      body: { files: [{ name: "resume.pdf", type: "application/pdf", size: 100 }] },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(storageMock.getUploadURL).not.toHaveBeenCalled();
  });

  it("rejects another vendor's storage key before metadata lookup or database write", async () => {
    const res = responseMock();
    await submitVendorProfiles({
      ...vendorRequest,
      params: { id: "opening-1" },
      body: { profiles: [{ s3Key: "tenant-1/opening-1/vendor-2/resume.pdf" }] },
    } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(storageMock.getObjectMetadata).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("denies preview and deletion for another vendor's profile", async () => {
    prismaMock.hiringProfile.findUnique.mockResolvedValue({
      id: 8, uploadedBy: "vendor-2", isDeleted: false,
      s3Key: "tenant-1/opening-1/vendor-2/resume.pdf",
      opening: { tenantId: "tenant-1" },
    });
    const previewRes = responseMock();
    await previewVendorProfile({ ...vendorRequest, params: { id: "8" } } as any, previewRes);
    const deleteRes = responseMock();
    await softDeleteVendorProfile({ ...vendorRequest, params: { id: "8" } } as any, deleteRes);

    expect(previewRes.status).toHaveBeenCalledWith(404);
    expect(deleteRes.status).toHaveBeenCalledWith(404);
    expect(storageMock.getObjectURL).not.toHaveBeenCalled();
    expect(prismaMock.hiringProfile.update).not.toHaveBeenCalled();
  });
});
