// Server-only admin auth: one shared password (ADMIN_PASSWORD) and a signed,
// httpOnly session cookie. No user table — deliberately simple.
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "mkx_admin";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export const adminEnabled = (): boolean => Boolean(process.env.ADMIN_PASSWORD);

function sessionKey(): string {
  const password = process.env.ADMIN_PASSWORD ?? "";
  return createHash("sha256").update(`mkx-admin:${password}:${process.env.EBOOK_LINK_SECRET ?? ""}`).digest("hex");
}

export function passwordMatches(input: string): boolean {
  const expected = createHash("sha256").update(process.env.ADMIN_PASSWORD ?? "").digest();
  const actual = createHash("sha256").update(input).digest();
  return adminEnabled() && timingSafeEqual(expected, actual);
}

export function newSessionToken(): { token: string; maxAgeSeconds: number } {
  const exp = Date.now() + SESSION_MS;
  const sig = createHmac("sha256", sessionKey()).update(String(exp)).digest("base64url");
  return { token: `${exp}.${sig}`, maxAgeSeconds: SESSION_MS / 1000 };
}

function tokenValid(token: string | undefined): boolean {
  if (!token || !adminEnabled()) return false;
  const [expRaw, sig = ""] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = Buffer.from(createHmac("sha256", sessionKey()).update(String(exp)).digest("base64url"));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function isAdmin(): Promise<boolean> {
  return tokenValid((await cookies()).get(ADMIN_COOKIE)?.value);
}

// Throttle password guessing per IP (in-memory is enough for a single instance).
const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginAllowed(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) return true;
  return entry.count < 8;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + 10 * 60_000 });
  else entry.count += 1;
}
