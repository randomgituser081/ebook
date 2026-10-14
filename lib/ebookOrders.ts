// Server-only helpers shared by the /api/ebook/* routes: order references,
// signed download links, and "payment confirmed → email the book" fulfilment.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getBook, type Book } from "@/lib/books";
import { sendEmail } from "@/lib/lenhub";
import { resolvePayment } from "@/lib/nomba";
import {
  consumeDownload as consumeOrderDownload,
  getOrder,
  markEmailed,
  markPaid,
  saveCheckout,
  saveEmailIfMissing,
} from "@/lib/orders";

// The book id is part of the reference, so a payment can be matched to its book even
// if the order record is lost (e.g. a webhook arriving after a redeploy).
const REF_PATTERN = /^MKX-BK-([a-z0-9]{3,16})-\d{13}-[A-Z0-9]{6}$/;

// A link works for 7 days and for a few downloads. Not strictly once: mail scanners
// (Outlook SafeLinks, etc.) fetch links before the reader clicks, and phones retry
// failed downloads, so a hard one-time limit would burn links for real buyers.
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_DOWNLOADS = Number(process.env.EBOOK_MAX_DOWNLOADS) || 3;

export function newOrderReference(bookId: string): string {
  const rand = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `MKX-BK-${bookId}-${Date.now()}-${rand}`;
}

// The Nomba account is shared with other products, so only accept refs this store
// generated — otherwise a paid order for something else could unlock a book.
export function isEbookReference(ref: string | null | undefined): ref is string {
  return Boolean(ref && REF_PATTERN.test(ref));
}

export function bookIdFromReference(ref: string): string | null {
  return REF_PATTERN.exec(ref)?.[1] ?? null;
}

// Public origin of this site: SITE_URL if set, else the proxy's forwarded host, else the request URL.
export function siteUrlFrom(req: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

// ---- Signed download links -------------------------------------------------

function linkSecret(): string {
  const explicit = process.env.EBOOK_LINK_SECRET;
  if (explicit) return explicit;
  const fallback = process.env.NOMBA_PRIVATE_KEY;
  if (!fallback) throw new Error("Set EBOOK_LINK_SECRET (or NOMBA_PRIVATE_KEY) to sign download links");
  return createHash("sha256").update(`mkx-ebook-link:${fallback}`).digest("hex");
}

function signature(ref: string, exp: number): string {
  return createHmac("sha256", linkSecret()).update(`${ref}.${exp}`).digest("base64url");
}

export function signedDownloadUrl(siteUrl: string, ref: string): string {
  const exp = Date.now() + LINK_TTL_MS;
  const query = new URLSearchParams({ ref, exp: String(exp), sig: signature(ref, exp) });
  return `${siteUrl}/api/ebook/download?${query}`;
}

export type LinkCheck = "ok" | "invalid" | "expired";

export function checkDownloadLink(ref: string, expRaw: string | null, sig: string | null): LinkCheck {
  const exp = Number(expRaw);
  if (!isEbookReference(ref) || !Number.isFinite(exp) || !sig) return "invalid";
  const expected = Buffer.from(signature(ref, exp));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "invalid";
  return Date.now() > exp ? "expired" : "ok";
}

// ---- Settlement (verify payment → record sale → email → link) --------------

export type SettleResult =
  | { status: "pending" }
  | { status: "paid"; downloadUrl: string; emailedTo: string | null; bookTitle: string };

// A paid order never becomes unpaid, so remember confirmations per server instance
// (and persistently via the order's paidAt).
const paidRefs = new Set<string>();
const inflight = new Map<string, Promise<SettleResult>>();

function maskEmail(email: string): string {
  const [user, domain = ""] = email.split("@");
  return `${user.slice(0, 2)}${"*".repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function emailHtml(book: Book, downloadUrl: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <p style="font-size:16px;line-height:1.6">Thank you for your purchase! Your payment is confirmed and your copy of <strong>${escapeHtml(book.title)}</strong> is ready.</p>
  <p style="margin:28px 0"><a href="${downloadUrl}" style="background:#995982;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:bold;display:inline-block">Download your ebook</a></p>
  <p style="font-size:14px;line-height:1.6;color:#555">This personal link is valid for 7 days and works for up to ${MAX_DOWNLOADS} downloads, so please save the PDF once it opens.</p>
  <p style="font-size:14px;line-height:1.6;color:#555">If the button doesn't work, copy this address into your browser:<br><span style="word-break:break-all">${escapeHtml(downloadUrl)}</span></p>
  <p style="font-size:13px;color:#888;margin-top:32px">Maekandex Bookstore</p>
</div>`;
}

/**
 * Confirms payment with Nomba (or trusts a signed webhook), records the sale, then emails
 * the download link exactly once per order. Safe to call repeatedly from the poll route and the webhook.
 */
export function settleOrder(
  ref: string,
  siteUrl: string,
  opts: { trusted?: boolean; emailHint?: string | null } = {},
): Promise<SettleResult> {
  const existing = inflight.get(ref);
  if (existing) return existing;

  const run = doSettle(ref, siteUrl, opts).finally(() => inflight.delete(ref));
  inflight.set(ref, run);
  return run;
}

async function doSettle(
  ref: string,
  siteUrl: string,
  opts: { trusted?: boolean; emailHint?: string | null },
): Promise<SettleResult> {
  const bookId = bookIdFromReference(ref);
  const book = bookId ? await getBook(bookId) : undefined;
  if (!book) return { status: "pending" };

  let record = await getOrder(ref);
  let emailFromNomba: string | null = null;

  if (!paidRefs.has(ref) && !record?.paidAt) {
    // What this buyer was actually charged: the price saved at checkout, not today's price
    // (the admin may have changed it since). Falls back to the current price if unknown.
    const expected = record?.amountNaira ?? book.priceNaira;
    let amountPaid = expected;
    if (!opts.trusted) {
      const payment = await resolvePayment(ref);
      const amountOk = payment.amountNaira === null || payment.amountNaira >= expected;
      if (!payment.paid || !amountOk) return { status: "pending" };
      amountPaid = payment.amountNaira ?? expected;
      emailFromNomba = payment.customerEmail;
    }
    // This is the sales record the admin dashboard reads.
    await markPaid(ref, { bookId: book.id, amountNaira: amountPaid });
    record = await getOrder(ref);
  }
  paidRefs.add(ref);

  const recipient = record?.email || opts.emailHint || emailFromNomba;
  // Keep the buyer's address on the sales record even if the email below fails.
  if (recipient && record?.email !== recipient) {
    await saveEmailIfMissing(ref, recipient);
  }
  const downloadUrl = signedDownloadUrl(siteUrl, ref);
  let emailed = Boolean(record?.emailedAt);

  if (recipient && !emailed) {
    try {
      await sendEmail({
        recipient,
        subject: `Your ebook: ${book.title}`,
        message: emailHtml(book, downloadUrl),
        greetings: record?.name ? `Dear ${record.name}` : "Hello",
      });
      await markEmailed(ref, recipient);
      emailed = true;
    } catch (error) {
      // Payment is confirmed, so never block the buyer — the page still shows the download.
      console.error(`[bookstore] email failed ref=${ref}:`, error);
    }
  }

  return {
    status: "paid",
    downloadUrl,
    emailedTo: emailed && recipient ? maskEmail(recipient) : null,
    bookTitle: book.title,
  };
}

export function rememberOrder(
  ref: string,
  details: { email: string; name: string; bookId: string; amountNaira: number },
): Promise<void> {
  return saveCheckout(ref, details);
}

/** Counts a download; false once the link has been used MAX_DOWNLOADS times. */
export function consumeDownload(ref: string): Promise<boolean> {
  return consumeOrderDownload(ref, MAX_DOWNLOADS);
}
