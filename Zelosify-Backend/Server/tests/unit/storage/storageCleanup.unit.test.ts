import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { storageDeletion: { findMany: vi.fn(), delete: vi.fn(), update: vi.fn() } },
  storage: { deleteObject: vi.fn() },
}));

vi.mock("../../../src/config/prisma/prisma.js", () => ({ default: mocks.prisma }));
vi.mock("../../../src/services/storage/storageFactory.js", () => ({
  createStorageService: () => mocks.storage,
  getStorageLocation: () => ({ provider: "aws", bucketName: "resume-bucket" }),
}));

import { processPendingStorageDeletions } from "../../../src/services/storage/storageCleanupService.js";

describe("retryable object storage cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.storageDeletion.findMany.mockResolvedValue([{
      id: "cleanup-1",
      objectKey: "candidate-resumes/tenant-9/candidate-42/resume.pdf",
      storageProvider: "aws",
      bucketName: "resume-bucket",
      attemptCount: 0,
    }]);
    mocks.prisma.storageDeletion.delete.mockResolvedValue({ id: "cleanup-1" });
    mocks.prisma.storageDeletion.update.mockResolvedValue({ id: "cleanup-1" });
    mocks.storage.deleteObject.mockResolvedValue(undefined);
  });

  it("deletes the saved object from its recorded bucket and clears the outbox row", async () => {
    await processPendingStorageDeletions();
    expect(mocks.storage.deleteObject).toHaveBeenCalledWith(
      "candidate-resumes/tenant-9/candidate-42/resume.pdf",
      "resume-bucket",
    );
    expect(mocks.prisma.storageDeletion.delete).toHaveBeenCalledWith({ where: { id: "cleanup-1" } });
    expect(mocks.prisma.storageDeletion.update).not.toHaveBeenCalled();
  });

  it("retains failed cleanup for retry with backoff and a safe provider error code", async () => {
    mocks.storage.deleteObject.mockRejectedValueOnce(Object.assign(new Error("private provider response"), { code: "ServiceUnavailable" }));

    await processPendingStorageDeletions();

    expect(mocks.prisma.storageDeletion.delete).not.toHaveBeenCalled();
    expect(mocks.prisma.storageDeletion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "cleanup-1" },
      data: expect.objectContaining({
        attemptCount: 1,
        lastErrorCode: "ServiceUnavailable",
        nextAttemptAt: expect.any(Date),
      }),
    }));
  });
});
