import { AwsStorageService } from "./aws/awsStorageService.js";
import { GoogleCloudStorageService } from "./gcp/googleCloudStorageService.js";
import { StorageService } from "./storageService.js";
import { ENV } from "../../constants/env.js";

export function getStorageLocation(): { provider: "aws" | "google"; bucketName: string } {
  const provider = (ENV.STORAGE_PROVIDER || "aws").toLowerCase();
  if (["gcp", "google", "google-cloud", "gcs"].includes(provider)) {
    return {
      provider: "google",
      bucketName: ENV.GCS_BUCKET_NAME || ENV.GOOGLE_CLOUD_BUCKET || ENV.GCP_STORAGE_BUCKET || ENV.S3_BUCKET_NAME,
    };
  }
  return { provider: "aws", bucketName: ENV.S3_BUCKET_NAME };
}

let storageServiceInstance: StorageService | null = null;




export const createStorageService = (): StorageService => {
  if (storageServiceInstance) {
    return storageServiceInstance;
  }

  const provider = (ENV.STORAGE_PROVIDER || "aws").toLowerCase();

  switch (provider) {
    case "gcp":
    case "google":
    case "google-cloud":
    case "gcs":
      storageServiceInstance = new GoogleCloudStorageService();
      break;

    case "aws":
    case "s3":
      storageServiceInstance = new AwsStorageService();
      break;

    default:
      throw new Error(
        `Unsupported storage provider: ${provider}. Supported providers: google (gcp, gcs, google-cloud) or aws (s3)`
      );
  }

  return storageServiceInstance;
};




export const resetStorageService = (): void => {
  storageServiceInstance = null;
};
