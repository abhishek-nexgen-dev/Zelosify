
export const formatPublicKey = (
  key: string | undefined
): string | undefined => {
  if (!key) return undefined;


  if (key.includes("-----BEGIN PUBLIC KEY-----")) {
    return key;
  }


  return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
};
