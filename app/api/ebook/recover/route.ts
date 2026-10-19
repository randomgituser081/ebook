import { NextResponse } from "next/server";
import { recoverPurchases, siteUrlFrom } from "@/lib/ebookOrders";
import { allow, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Always answers the same way whether or not the email has a purchase, so this form can't be
// used to find out who has bought what.
const SAME_ANSWER = {
  ok: true,
  message: "If that email has a purchase, a new download link is on its way. Check your inbox and spam folder.",
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email) || email.length > 200) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  // Stop the form being used to flood an inbox or the database.
  if (!allow(`recover-ip:${clientIp(req)}`, 10, 15 * 60_000) || !allow(`recover-email:${email}`, 4, 60 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a little while and try again." },
      { status: 429 },
    );
  }

  try {
    await recoverPurchases(email, siteUrlFrom(req));
  } catch (error) {
    console.error("Recover purchases failed:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't send the email right now. Please try again in a few minutes." },
      { status: 502 },
    );
  }

  return NextResponse.json(SAME_ANSWER);
}
