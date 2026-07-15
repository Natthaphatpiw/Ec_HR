import { NextRequest, NextResponse } from "next/server";
import {
  DASHBOARD_SESSION_COOKIE,
  getDashboardAuthState,
} from "@/lib/dashboard-auth-config";
import { verifySignedSession } from "@/lib/signed-session";

export async function middleware(request: NextRequest) {
  const auth = getDashboardAuthState();
  if (auth.status === "disabled") return NextResponse.next();

  if (auth.status === "enabled") {
    const session = await verifySignedSession(
      request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value,
      auth.secret,
      "dashboard",
    );
    if (session?.role === "owner") return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (auth.status === "misconfigured") loginUrl.searchParams.set("error", "config");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
