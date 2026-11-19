import { NextResponse } from "next/server";
import { getLoginRedirectPath, isJwtExpired } from "@/utils/Auth/sessionAuth";

export function middleware(request) {
  const path = request.nextUrl.pathname;
  const redirectPath = getLoginRedirectPath(path, request.nextUrl.search);
  if (!redirectPath) return NextResponse.next();

  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken && !isJwtExpired(accessToken)) return NextResponse.next();

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  for (const cookieName of ["access_token", "refresh_token", "temp_token"]) {
    response.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
  }
  return response;
}

export const config = {
  matcher: [
    "/user/:path*",
    "/vendor/:path*",
    "/hiring-manager/:path*",
    "/candidate/:path*",
    "/recruiter/:path*",
    "/admin/:path*",
  ],
};
