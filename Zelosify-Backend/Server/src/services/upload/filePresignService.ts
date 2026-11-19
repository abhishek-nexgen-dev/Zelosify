import { encrypt } from "../../utils/encryption/encryption.js";
import { sanitizeFilename } from "../../helpers/vendorRequestValidation.js";
import {
  PresignedUploadConfig,
  UploadMetadata,
  UploadToken,
} from "../../types/typeIndex.js";
import { ENV } from "../../config/env.js";

export class FilePresignService {
  private static get DEFAULT_EXPIRY_DURATION(): number {
    return ENV.UPLOAD_TOKEN_EXPIRY_MS;
  }












  public async generateUploadTokens(
    filenames: string[],
    config: PresignedUploadConfig
  ): Promise<UploadToken[]> {

    const { createStorageService } = await import(
      "../storage/storageFactory.js"
    );
    const storageService = createStorageService();

    const expiryDuration =
      config.expiryDuration || FilePresignService.DEFAULT_EXPIRY_DURATION;


    const uploadTokens = await Promise.all(
      filenames.map(async (filename: string) => {
        const uploadToken = await this.generateSingleUploadToken(
          filename,
          config,
          storageService,
          expiryDuration
        );
        return uploadToken;
      })
    );

    return uploadTokens;
  }












  private async generateSingleUploadToken(
    filename: string,
    config: PresignedUploadConfig,
    storageService: any,
    expiryDuration: number
  ): Promise<UploadToken> {
    try {

      const key = this.generateUniqueKey(filename, config);
      const sanitizedFilename = sanitizeFilename(filename);


      const uploadUrl = await storageService.getUploadURL(key);


      const uploadMetadata: UploadMetadata = {
        key,
        url: uploadUrl,
        filename: sanitizedFilename,
        tenantId: config.tenantId,
        expiresAt: Date.now() + expiryDuration,
        ...(config.customMetadata && { customFields: config.customMetadata }),
      };


      const encryptedToken = encrypt(JSON.stringify(uploadMetadata));

      return {
        filename: sanitizedFilename,
        uploadToken: encryptedToken,
        uploadEndpoint: config.uploadEndpoint,
      };
    } catch (error) {
      console.error(`Error generating presigned URL for ${filename}:`, error);
      throw new Error(`Failed to generate upload URL for ${filename}`);
    }
  }












  private generateUniqueKey(
    filename: string,
    config: PresignedUploadConfig
  ): string {
    const sanitizedFilename = sanitizeFilename(filename);
    const { s3KeyConfig } = config;


    const pathParts = [...s3KeyConfig.pathSegments];


    let finalFilename = sanitizedFilename;

    if (s3KeyConfig.includeTimestamp) {
      const timestamp = Date.now();
      finalFilename = `${timestamp}_${sanitizedFilename}`;
    }

    if (s3KeyConfig.filenamePrefix) {
      finalFilename = `${s3KeyConfig.filenamePrefix}${finalFilename}`;
    }


    pathParts.push(finalFilename);

    return pathParts.join("/");
  }
}
