// Server-only helpers shared by the /api/ebook/* routes: order references,
// signed download links, and "payment confirmed → email the book" fulfilment.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getBook, type Book } from "@/lib/books";
import { sendEmail } from "@/lib/lenhub";
import { resolvePayment } from "@/lib/nomba";
import {
  consumeDownload as consumeOrderDownload,
  claimResend,
  getOrder,
  listPaidOrdersByEmail,
  listPendingRefs,
  markEmailed,
  markPaid,
  releaseResends,
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
// How many times a buyer can ask for a fresh link to the same purchase (each gives a new set of downloads).
export const MAX_RESENDS = Number(process.env.EBOOK_MAX_RESENDS) || 3;

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
  <p style="font-size:14px;line-height:1.6;color:#555">Lost this email later? You can always get a new link at <a href="${new URL(downloadUrl).origin}/my-books" style="color:#a14f5b">${new URL(downloadUrl).origin}/my-books</a> using the email you paid with.</p>
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

// ---- Reconciliation ---------------------------------------------------------
// Nomba doesn't always send the buyer back to our site, and its payment webhook may point at
// another service (the Nomba account is shared). So the server also checks unconfirmed
// checkouts itself — often at first, then less and less — and settles any that were paid:
// the sale is recorded and the download link emailed even if the buyer never returns.

const lastChecked = new Map<string, number>();

function checkEveryMs(ageMs: number): number {
  if (ageMs < 10 * 60_000) return 25_000; // first 10 minutes: about every 30s
  if (ageMs < 60 * 60_000) return 5 * 60_000; // then every 5 minutes for an hour
  return 30 * 60_000; // then every 30 minutes, up to a day
}

export async function reconcilePendingOrders(siteUrl: string): Promise<{ checked: number; settled: number }> {
  const pending = await listPendingRefs(15_000, 24 * 60 * 60_000, 30);
  const now = Date.now();
  let checked = 0;
  let settled = 0;

  for (const { ref, createdAt } of pending) {
    if (!isEbookReference(ref)) continue;
    if (now - (lastChecked.get(ref) ?? 0) < checkEveryMs(now - createdAt)) continue;
    lastChecked.set(ref, now);
    checked++;
    try {
      const result = await settleOrder(ref, siteUrl);
      if (result.status === "paid") {
        settled++;
        lastChecked.delete(ref);
      }
    } catch (error) {
      console.warn(`[reconcile] ${ref}:`, (error as Error).message);
    }
  }

  if (lastChecked.size > 500) {
    for (const [ref, at] of lastChecked) if (now - at > 25 * 60 * 60_000) lastChecked.delete(ref);
  }
  return { checked, settled };
}

// ---- "Email me my link again" ------------------------------------------------
// A buyer who lost the email (or comes back another day) types the email they paid with.
// We never show anything on screen — the new link only goes to that inbox, so knowing
// someone's address isn't enough to get their book. Each purchase can be re-sent
// MAX_RESENDS times; every re-send gives a fresh set of downloads and a fresh 7 days.

function recoveryEmailHtml(items: Array<{ book: Book; url: string }>, blocked: number, siteUrl: string): string {
  const rows = items
    .map(
      ({ book, url }) => `
  <div style="border:1px solid #eadde5;border-radius:14px;padding:16px 18px;margin:14px 0">
    <p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:#5b2a4a">${escapeHtml(book.title)}</p>
    <a href="${url}" style="background:#995982;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">Download</a>
  </div>`,
    )
    .join("");
  const note = blocked
    ? `<p style="font-size:14px;line-height:1.6;color:#a14f5b">${blocked} other purchase${blocked > 1 ? "s have" : " has"} reached the limit of ${MAX_RESENDS} new links. Please contact us and we'll help.</p>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <p style="font-size:16px;line-height:1.6">Here ${items.length > 1 ? "are your download links" : "is your download link"}, as requested.</p>${rows}${note}
  <p style="font-size:14px;line-height:1.6;color:#555">Each link is valid for 7 days and works for up to ${MAX_DOWNLOADS} downloads. You can ask for a new link up to ${MAX_RESENDS} times per purchase at <a href="${siteUrl}/my-books" style="color:#a14f5b">${siteUrl}/my-books</a>.</p>
  <p style="font-size:14px;line-height:1.6;color:#999">If you didn't ask for this, you can ignore this email — nobody else can use these links without your inbox.</p>
  <p style="font-size:13px;color:#888;margin-top:32px">Maekandex Bookstore</p>
</div>`;
}

function limitEmailHtml(siteUrl: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <p style="font-size:16px;line-height:1.6">You asked for a new download link, but your purchase has already had ${MAX_RESENDS} new links sent, which is the limit.</p>
  <p style="font-size:15px;line-height:1.6">Please contact us at <a href="https://maekandex.com/contact-us" style="color:#a14f5b">maekandex.com/contact-us</a> and we'll sort it out. Mention the email you paid with.</p>
  <p style="font-size:13px;color:#888;margin-top:32px">Maekandex Bookstore · ${siteUrl}</p>
</div>`;
}

export async function recoverPurchases(email: string, siteUrl: string): Promise<void> {
  const orders = await listPaidOrdersByEmail(email);
  if (!orders.length) return; // nothing to send; the caller answers exactly the same way either way

  const granted: Array<{ ref: string; book: Book }> = [];
  let blocked = 0;
  for (const order of orders) {
    const book = await getBook(order.bookId);
    if (!book) continue;
    if (await claimResend(order.ref, MAX_RESENDS)) granted.push({ ref: order.ref, book });
    else blocked++;
  }
  if (!granted.length && !blocked) return;

  try {
    await sendEmail({
      recipient: email,
      subject: granted.length ? "Your ebook download link" : "Your ebook download link — limit reached",
      message: granted.length
        ? recoveryEmailHtml(
            granted.map(({ ref, book }) => ({ book, url: signedDownloadUrl(siteUrl, ref) })),
            blocked,
            siteUrl,
          )
        : limitEmailHtml(siteUrl),
      greetings: "Hello",
    });
  } catch (error) {
    // The email didn't go out, so don't count it against the buyer.
    await releaseResends(granted.map((g) => g.ref));
    throw error;
  }
}
