import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createStorageService,
  resetStorageService,
} from "../../../src/services/storage/storageFactory.js";
import { GoogleCloudStorageService } from "../../../src/services/storage/gcp/googleCloudStorageService.js";
import { AwsStorageService } from "../../../src/services/storage/aws/awsStorageService.js";
import type { Storage } from "@google-cloud/storage";

describe("Storage Service & Provider Factory", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetStorageService();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetStorageService();
  });

  it("creates GoogleCloudStorageService when STORAGE_PROVIDER is 'google'", () => {
    process.env.STORAGE_PROVIDER = "google";
    process.env.GCS_BUCKET_NAME = "my-gcp-test-bucket";

    const service = createStorageService();
    expect(service).toBeInstanceOf(GoogleCloudStorageService);
  });

  it("creates GoogleCloudStorageService when STORAGE_PROVIDER is 'gcp' or 'gcs'", () => {
    process.env.STORAGE_PROVIDER = "gcp";
    const service1 = createStorageService();
    expect(service1).toBeInstanceOf(GoogleCloudStorageService);

    resetStorageService();
    process.env.STORAGE_PROVIDER = "gcs";
    const service2 = createStorageService();
    expect(service2).toBeInstanceOf(GoogleCloudStorageService);
  });

  it("creates AwsStorageService when STORAGE_PROVIDER is 'aws' or 's3'", () => {
    process.env.STORAGE_PROVIDER = "aws";
    process.env.S3_AWS_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY_ID = "mock-key";
    process.env.S3_SECRET_ACCESS_KEY = "mock-secret";
    process.env.S3_BUCKET_NAME = "mock-bucket";

    const service = createStorageService();
    expect(service).toBeInstanceOf(AwsStorageService);
  });

  it("throws a descriptive error for an unknown storage provider", () => {
    process.env.STORAGE_PROVIDER = "unknown-cloud";

    expect(() => createStorageService()).toThrowError(/Unsupported storage provider/);
  });

  describe("GoogleCloudStorageService URL Generation & Operations", () => {
    const createSigner = () => ({
      bucket: () => ({
        file: () => ({
          getSignedUrl: vi.fn(async ({ action }: { action: string }) => [
            `https://signed.example.test/${action}`,
          ]),
        }),
      }),
    }) as unknown as Storage;

    it("generates a preview URL with key and bucket", async () => {
      process.env.GCS_BUCKET_NAME = "zelosify-gcp-bucket";
      const gcs = new GoogleCloudStorageService(createSigner());

      const url = await gcs.getObjectURL("tenant1/opening2/resume.pdf");
      expect(url).toBe("https://signed.example.test/read");
    });

    it("generates an upload URL for resume files and images", async () => {
      process.env.GCS_BUCKET_NAME = "zelosify-gcp-bucket";
      const gcs = new GoogleCloudStorageService(createSigner());

      const uploadUrl = await gcs.getUploadURL("tenant1/opening2/resume.pdf", "application/pdf");
      expect(uploadUrl).toBe("https://signed.example.test/write");
    });

    it("deletes a GCS object from the specified bucket", async () => {
      const remove = vi.fn().mockResolvedValue(undefined);
      const file = vi.fn(() => ({ delete: remove }));
      const bucket = vi.fn(() => ({ file }));
      const gcs = new GoogleCloudStorageService({ bucket } as unknown as Storage);

      await gcs.deleteObject("candidate-resumes/tenant-1/candidate-1/resume.pdf", "archive-bucket");

      expect(bucket).toHaveBeenCalledWith("archive-bucket");
      expect(file).toHaveBeenCalledWith("candidate-resumes/tenant-1/candidate-1/resume.pdf");
      expect(remove).toHaveBeenCalledWith({ ignoreNotFound: true });
    });
  });

  it("deletes an S3 object from the specified bucket", async () => {
    process.env.STORAGE_PROVIDER = "aws";
    process.env.S3_AWS_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY_ID = "mock-key";
    process.env.S3_SECRET_ACCESS_KEY = "mock-secret";
    process.env.S3_BUCKET_NAME = "default-bucket";
    const aws = new AwsStorageService();
    const client = (aws as unknown as { s3Client: { send: (...args: unknown[]) => Promise<unknown> } }).s3Client;
    const send = vi.spyOn(client, "send").mockResolvedValue({});

    await aws.deleteObject("candidate-resumes/tenant-1/candidate-1/resume.pdf", "archive-bucket");

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0]).toMatchObject({
      input: { Bucket: "archive-bucket", Key: "candidate-resumes/tenant-1/candidate-1/resume.pdf" },
    });
  });
});
