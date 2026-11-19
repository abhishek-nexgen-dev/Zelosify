


export interface UploadMetadata {

  key: string;

  url: string;

  filename: string;

  tenantId: string;

  expiresAt: number;

  customFields?: Record<string, any>;
}




export interface UploadToken {

  filename: string;

  uploadToken: string;

  uploadEndpoint: string;
}




export interface S3KeyConfig {

  pathSegments: string[];

  includeTimestamp?: boolean;

  filenamePrefix?: string;
}




export interface PresignedUploadConfig {

  s3KeyConfig: S3KeyConfig;

  tenantId: string;

  uploadEndpoint: string;

  expiryDuration?: number;

  customMetadata?: Record<string, any>;
}




export interface FileUploadRequest {

  fileBuffer: Buffer;

  mimeType: string;

  uploadToken: string;
}




export interface FileUploadResult {

  key: string;

  filename: string;

  customFields?: Record<string, any>;

  success: boolean;

  errorMessage?: string;
}




export interface TokenValidationOptions {

  validateTokenFn?: (metadata: any) => {
    isValid: boolean;
    errorMessage?: string;
  };
}
