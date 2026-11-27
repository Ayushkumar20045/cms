import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Temporary local preview mode. Production authentication remains enforced.
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

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
