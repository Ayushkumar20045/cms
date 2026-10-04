import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/*
 * Sends visitors without a session back to the login page before a portal page renders.
 * This is navigation only: the session cookie is HttpOnly and is verified by the backend on
 * every API call, so this check is not a security boundary.
 */
export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("gbu_access") || request.cookies.has("gbu_csrf");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/admin/:path*", "/staff/:path*"],
};
