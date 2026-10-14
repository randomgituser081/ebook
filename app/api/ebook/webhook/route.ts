import { NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  webhookCustomerEmail,
  webhookOrderReference,
  type WebhookBody,
} from "@/lib/nomba";
import { isEbookReference, settleOrder, siteUrlFrom } from "@/lib/ebookOrders";

export const runtime = "nodejs";

// Nomba payment webhook. Lets the book be emailed even if the buyer closes the
// browser before returning to the thank-you page. Always answers 200 like trios does.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 1_000_000) return new NextResponse(null, { status: 200 });

  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return new NextResponse(null, { status: 200 });
  }

  const eventType = (body.event_type ?? "").toLowerCase();
  const isSuccess = eventType.includes("success");
  if (eventType && !isSuccess) return new NextResponse(null, { status: 200 });

  // The Nomba account is shared with other products — ignore anything that isn't ours.
  const ref = webhookOrderReference(body);
  if (!isEbookReference(ref)) return new NextResponse(null, { status: 200 });

  // A signed success event is Nomba telling us money landed. An unsigned one is only
  // a hint, so we double-check it with a Nomba lookup instead of trusting it.
  const trusted = isSuccess && verifyWebhookSignature(body, req.headers);

  try {
    await settleOrder(ref, siteUrlFrom(req), { trusted, emailHint: webhookCustomerEmail(body) });
  } catch (error) {
    console.error(`[ebook webhook] settle failed ref=${ref}:`, error);
  }

  return new NextResponse(null, { status: 200 });
}
