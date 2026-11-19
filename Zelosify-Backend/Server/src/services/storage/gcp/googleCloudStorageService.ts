import { Storage } from "@google-cloud/storage";
import { Readable } from "stream";
import { getSignedUrlExpirySeconds, StorageService } from "../storageService.js";
import { ENV } from "../../../config/env.js";

export class GoogleCloudStorageService extends StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor(storageClient?: Storage) {
    super();

    const bucketName =
      ENV.GCS_BUCKET_NAME ||
      ENV.GOOGLE_CLOUD_BUCKET ||
      ENV.GCP_STORAGE_BUCKET ||
      ENV.S3_BUCKET_NAME ||
      "zelosify-recruit-bucket";

    this.bucketName = bucketName;

    const projectId =
      ENV.GCP_PROJECT_ID || ENV.GOOGLE_CLOUD_PROJECT;
    const keyFilename =
      ENV.GCP_KEY_FILE || ENV.GOOGLE_APPLICATION_CREDENTIALS;
    const clientEmail = ENV.GCP_CLIENT_EMAIL;
    const privateKey = ENV.GCP_PRIVATE_KEY
      ? ENV.GCP_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined;

    const storageOptions: any = {};
    if (projectId) storageOptions.projectId = projectId;
    if (keyFilename) storageOptions.keyFilename = keyFilename;
    if (clientEmail && privateKey) {
      storageOptions.credentials = {
        client_email: clientEmail,
        private_key: privateKey,
      };
    }

    this.storage = storageClient ?? new Storage(storageOptions);
  }

  async getObjectURL(key: string): Promise<string> {
    const file = this.storage.bucket(this.bucketName).file(key);
    const expiresInSeconds = getSignedUrlExpirySeconds();

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresInSeconds * 1000,
    });

    return url;
  }

  async getObjectMetadata(key: string): Promise<{ size: number; contentType: string | null }> {
    const [metadata] = await this.storage.bucket(this.bucketName).file(key).getMetadata();
    const size = Number(metadata.size);
    if (!Number.isFinite(size)) {
      throw new Error("Uploaded resume is missing its content length");
    }
    return { size, contentType: metadata.contentType ?? null };
  }

  async getObjectStream(key: string): Promise<Readable> {
    try {
      console.log("[Google Cloud Storage] Getting object stream for:", {
        bucket: this.bucketName,
        key,
      });

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(key);
      return file.createReadStream();
    } catch (error: any) {
      console.error("[Google Cloud Storage] Error getting object stream:", error);
      throw error;
    }
  }

  async putObject(
    key: string,
    file: Buffer | Uint8Array | Blob | string,
    contentType = "application/pdf"
  ): Promise<{ message: string }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const gcsFile = bucket.file(key);
      const buffer = Buffer.isBuffer(file)
        ? file
        : typeof file === "string"
        ? Buffer.from(file)
        : Buffer.from(file as Uint8Array);

      await gcsFile.save(buffer, {
        contentType,
        resumable: false,
      });

      return { message: "File uploaded successfully to Google Cloud Storage" };
    } catch (error: any) {
      console.error("[Google Cloud Storage] Error uploading file:", error);
      throw error;
    }
  }

  async deleteObject(key: string, bucketName = this.bucketName): Promise<void> {
    await this.storage.bucket(bucketName).file(key).delete({ ignoreNotFound: true });
  }

  async listObjects(prefix: string): Promise<any[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({ prefix });
      return files.map((f) => ({
        Key: f.name,
        LastModified: f.metadata.updated,
        Size:
          typeof f.metadata.size === "string"
            ? parseInt(f.metadata.size, 10)
            : f.metadata.size,
        contentType: f.metadata.contentType,
      }));
    } catch (error: any) {
      console.error("[Google Cloud Storage] Error listing objects:", error);
      throw error;
    }
  }

  async getUploadURL(
    key: string,
    contentType: string = "application/pdf"
  ): Promise<string> {
    const file = this.storage.bucket(this.bucketName).file(key);
    const expiresInSeconds = getSignedUrlExpirySeconds();

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      contentType,
      expires: Date.now() + expiresInSeconds * 1000,
    });

    return url;
  }
}
