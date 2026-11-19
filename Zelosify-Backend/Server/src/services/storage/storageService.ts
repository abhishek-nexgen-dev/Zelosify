
import { Readable } from "stream";
import { ENV } from "../../config/env.js";

export function getSignedUrlExpirySeconds(): number {
  const configured = Number(
    ENV.STORAGE_SIGNED_URL_EXPIRES_IN ||
      ENV.GCS_SIGNED_URL_EXPIRES_IN ||
      ENV.S3_PRESIGNED_URL_EXPIRES_IN ||
      600,
  );
  if (!Number.isFinite(configured)) return 600;
  return Math.min(900, Math.max(60, Math.floor(configured)));
}

export abstract class StorageService {
  abstract getObjectMetadata(key: string): Promise<{
    size: number;
    contentType: string | null;
  }>;

  abstract getObjectURL(key: string): Promise<string>;

  abstract getObjectStream(key: string): Promise<Readable>;

  abstract putObject(
    key: string,
    file: Buffer | Uint8Array | Blob | string,
    contentType?: string
  ): Promise<{ message: string }>;

  abstract deleteObject(key: string, bucketName?: string): Promise<void>;

  abstract listObjects(prefix: string): Promise<any[]>;

  abstract getUploadURL(key: string, contentType?: string): Promise<string>;
}
