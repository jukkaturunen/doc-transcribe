// Single shared-password gate. No user accounts — one password protects the
// whole app (and the paid Claude/Google API routes). A valid login sets an
// HttpOnly bearer cookie whose value equals APP_SESSION_SECRET; this middleware
// lets a request through only when that cookie matches.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Constant-time-ish string compare to avoid leaking length/prefix via timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const secret = process.env.APP_SESSION_SECRET ?? "";
  const cookie = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const authed = secret !== "" && safeEqual(cookie, secret);
  if (authed) return NextResponse.next();

  // Not authenticated: APIs get a 401, page navigations get the login screen.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

// Protect everything except the login page, the login API, and static assets.
export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
