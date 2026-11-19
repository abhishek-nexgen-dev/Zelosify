import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma/prisma.js";
import { createStorageService, getStorageLocation } from "./storageFactory.js";

type CleanupEntry = {
  id: string;
  objectKey: string;
  storageProvider: string;
  bucketName: string;
  attemptCount: number;
};

let cleanupRunning = false;

function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const providerCode = "code" in error ? String(error.code) : "";
    if (/^[A-Za-z0-9_-]{1,40}$/.test(providerCode)) return providerCode;
    const status = "$metadata" in error && typeof error.$metadata === "object" && error.$metadata !== null && "httpStatusCode" in error.$metadata
      ? Number(error.$metadata.httpStatusCode)
      : 0;
    if (Number.isInteger(status) && status >= 400 && status <= 599) return `HTTP_${status}`;
  }
  return "STORAGE_DELETE_FAILED";
}

export async function enqueueStorageDeletion(
  transaction: Prisma.TransactionClient,
  objectKey: string,
): Promise<void> {
  const location = getStorageLocation();
  await transaction.storageDeletion.upsert({
    where: { objectKey },
    create: { id: randomUUID(), objectKey, storageProvider: location.provider, bucketName: location.bucketName },
    update: {},
  });
}

async function processEntry(entry: CleanupEntry): Promise<void> {
  const currentLocation = getStorageLocation();
  if (entry.storageProvider !== currentLocation.provider) {
    await prisma.storageDeletion.update({
      where: { id: entry.id },
      data: { attemptCount: { increment: 1 }, lastErrorCode: "STORAGE_PROVIDER_CHANGED", nextAttemptAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    return;
  }

  try {
    await createStorageService().deleteObject(entry.objectKey, entry.bucketName);
    await prisma.storageDeletion.delete({ where: { id: entry.id } });
  } catch (error) {
    const attemptCount = entry.attemptCount + 1;
    const backoffMs = Math.min(60 * 60 * 1000, 15_000 * 2 ** Math.min(attemptCount - 1, 8));
    await prisma.storageDeletion.update({
      where: { id: entry.id },
      data: {
        attemptCount,
        lastErrorCode: getErrorCode(error),
        nextAttemptAt: new Date(Date.now() + backoffMs),
      },
    }).catch(() => undefined);
  }
}

export async function processPendingStorageDeletions(): Promise<void> {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const entries = await prisma.storageDeletion.findMany({
      where: { nextAttemptAt: { lte: new Date() } },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
      take: 50,
    });
    for (const entry of entries) await processEntry(entry);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "STORAGE_CLEANUP_SCAN_FAILED", errorCode: getErrorCode(error) }));
  } finally {
    cleanupRunning = false;
  }
}

export function scheduleStorageCleanup(): void {
  setImmediate(() => { void processPendingStorageDeletions(); });
}
