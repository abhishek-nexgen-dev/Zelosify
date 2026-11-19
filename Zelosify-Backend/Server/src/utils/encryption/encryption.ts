import crypto from "crypto";
import { ENV } from "../../config/env.js";

const getEncryptionConfig = () => {
  const algorithm = ENV.ENCRYPTION_ALGORITHM || "aes-256-gcm";
  const key = ENV.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not defined in environment variables");
  }
  return { algorithm, keyBuffer: Buffer.from(key, "hex") };
};


export const encrypt = (text: string): string => {
  const { algorithm, keyBuffer } = getEncryptionConfig();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    algorithm,
    keyBuffer,
    iv
  ) as crypto.CipherGCM;
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};


export const decrypt = (encryptedText: string): string => {
  const { algorithm, keyBuffer } = getEncryptionConfig();
  const [ivHex, authTagHex, encryptedData] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(
    algorithm,
    keyBuffer,
    iv
  ) as crypto.DecipherGCM;
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
