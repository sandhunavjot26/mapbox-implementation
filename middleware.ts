/**
 * Auth middleware — protect /dashboard from unauthenticated access.
 * Redirects to /login when aeroshield_auth cookie is missing.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const hasAuth = request.cookies.get("aeroshield_auth")?.value === "1";
    if (!hasAuth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
