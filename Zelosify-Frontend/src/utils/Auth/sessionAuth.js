const PROTECTED_PATH_ROOTS = [
  "/user",
  "/vendor",
  "/hiring-manager",
  "/candidate",
  "/recruiter",
  "/admin",
];

export function isProtectedPath(pathname) {
  return PROTECTED_PATH_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function getLoginRedirectPath(pathname, search = "", allowPublicRoute = false) {
  if ((!allowPublicRoute && !isProtectedPath(pathname)) || pathname === "/login") return null;
  const returnTo = `${pathname}${search}`;
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export function isJwtExpired(token, nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return true;
    const base64 = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp !== "number" || payload.exp <= nowSeconds;
  } catch {
    return true;
  }
}

export function isExpiredSessionMessage(message) {
  if (typeof message !== "string") return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid or expired token") ||
    normalized.includes("invalid or expired temp token") ||
    normalized.includes("invalid or expired access token") ||
    normalized.includes("login session is missing or expired") ||
    normalized.includes("sign-in session expired")
  );
}

export function redirectOnUnauthorizedSession(error, location, clearSession) {
  if (error?.response?.status !== 401 || !location) return false;
  const redirectPath = getLoginRedirectPath(location.pathname, location.search);
  if (!redirectPath) return false;
  clearSession();
  location.replace(redirectPath);
  return true;
}
