import { decrypt } from "../../utils/encryption/encryption.js";
import axios from "axios";
import {
  FileUploadRequest,
  FileUploadResult,
  TokenValidationOptions,
  UploadMetadata,
} from "../../types/typeIndex.js";








export class FileUploadService {







  public async uploadFile(
    uploadRequest: FileUploadRequest,
    options?: TokenValidationOptions
  ): Promise<FileUploadResult> {
    try {

      const uploadMetadata = await this.decryptAndValidateToken(
        uploadRequest.uploadToken,
        options?.validateTokenFn
      );


      await this.uploadToS3(
        uploadMetadata.url,
        uploadRequest.fileBuffer,
        uploadRequest.mimeType
      );


      return {
        key: uploadMetadata.key,
        filename: uploadMetadata.filename,
        customFields: uploadMetadata.customFields,
        success: true,
      };
    } catch (error: any) {
      console.error("Error in file upload:", error.message);
      return {
        key: "",
        filename: "",
        success: false,
        errorMessage: error.message || "Unknown error during file upload",
      };
    }
  }










  private async decryptAndValidateToken(
    uploadToken: string,
    validateTokenFn?: (metadata: any) => {
      isValid: boolean;
      errorMessage?: string;
    }
  ): Promise<UploadMetadata> {
    try {

      const decryptedToken = decrypt(uploadToken);
      const uploadMetadata = JSON.parse(decryptedToken) as UploadMetadata;


      if (Date.now() > uploadMetadata.expiresAt) {
        throw new Error("Upload token has expired");
      }


      if (validateTokenFn) {
        const validationResult = validateTokenFn(uploadMetadata);

        if (!validationResult.isValid) {
          throw new Error(
            validationResult.errorMessage || "Invalid upload token"
          );
        }
      }

      return uploadMetadata;
    } catch (error: any) {
      console.error(
        "Error decrypting or validating upload token:",
        error.message
      );
      throw new Error(error.message || "Invalid upload token");
    }
  }










  private async uploadToS3(
    presignedUrl: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<void> {
    try {
      const uploadResponse = await axios.put(presignedUrl, fileBuffer, {
        headers: {
          "Content-Type": mimeType,
        },
        maxRedirects: 0,
      });

      if (uploadResponse.status !== 200) {
        throw new Error(
          `S3 upload failed with status: ${uploadResponse.status}`
        );
      }
    } catch (error: any) {
      console.error("Error uploading file to S3:", error.message);
      throw new Error(error.message || "Failed to upload file to storage");
    }
  }
}
