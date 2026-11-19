



export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}




export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}
