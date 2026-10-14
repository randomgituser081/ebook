import { NextResponse } from "next/server";
import { isEbookReference, settleOrder, siteUrlFrom } from "@/lib/ebookOrders";

export const runtime = "nodejs";

// Polled by the thank-you page. Confirms payment with Nomba, emails the download
// link (once), and returns the same signed link for the on-page button.
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref");

  if (!isEbookReference(ref)) {
    return NextResponse.json({ ok: false, status: "invalid", error: "Invalid payment reference." }, { status: 400 });
  }

  try {
    const result = await settleOrder(ref, siteUrlFrom(req));
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Ebook verify error:", error);
    // Never hard-fail a polling client — report pending and let it retry.
    return NextResponse.json({ ok: true, status: "pending" });
  }
}
