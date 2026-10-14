import { NextResponse } from "next/server";
import { getBook } from "@/lib/books";
import { createCheckoutOrder, isNombaServerConfigured } from "@/lib/nomba";
import { newOrderReference, rememberOrder, siteUrlFrom } from "@/lib/ebookOrders";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const bookId = String(body?.bookId ?? "").trim();
  const fullName = String(body?.fullName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = String(body?.phone ?? "").trim();

  if (fullName.length < 2 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter your full name and a valid email address." },
      { status: 400 },
    );
  }

  // The price always comes from the catalogue — the browser never sends an amount.
  const book = bookId ? await getBook(bookId) : undefined;
  if (!book || !book.published) {
    return NextResponse.json({ ok: false, error: "This book is not available." }, { status: 404 });
  }

  if (!isNombaServerConfigured) {
    console.error("Checkout: Nomba env vars are missing (NOMBA_CLIENT_ID, NOMBA_PRIVATE_KEY, NOMBA_ACCOUNT_ID).");
    return NextResponse.json(
      { ok: false, error: "Payments are not available right now. Please try again later." },
      { status: 503 },
    );
  }

  const reference = newOrderReference(book.id);

  try {
    // Saved first so the webhook / poll can email the buyer even if Nomba omits the address.
    await rememberOrder(reference, { email, name: fullName, bookId: book.id, amountNaira: book.priceNaira });

    const { checkoutLink } = await createCheckoutOrder({
      amountNaira: book.priceNaira,
      customerEmail: email,
      customerId: email,
      orderReference: reference,
      callbackUrl: `${siteUrlFrom(req)}/thank-you?ref=${encodeURIComponent(reference)}`,
      metadata: { product: book.slug, fullName, phone },
    });

    return NextResponse.json({ ok: true, reference, checkoutLink });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't start your payment. Please try again." },
      { status: 502 },
    );
  }
}
