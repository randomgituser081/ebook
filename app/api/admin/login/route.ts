import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminEnabled,
  loginAllowed,
  newSessionToken,
  passwordMatches,
  recordLoginFailure,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin is not configured (set ADMIN_PASSWORD)." }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!loginAllowed(ip)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!passwordMatches(String(body?.password ?? ""))) {
    recordLoginFailure(ip);
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const { token, maxAgeSeconds } = newSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return res;
}
