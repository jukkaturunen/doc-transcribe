// Login/logout for the shared-password gate. Verifies the password against
// APP_PASSWORD (server-side only) and, on success, sets the HttpOnly session
// cookie that middleware.ts checks. No accounts, no database.
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  const secret = process.env.APP_SESSION_SECRET;
  if (!password || !secret) {
    return NextResponse.json(
      { error: "Auth is not configured on the server." },
      { status: 500 },
    );
  }

  let submitted: unknown;
  try {
    submitted = (await request.json())?.password;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (submitted !== password) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return res;
}

// Logout: clear the session cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
