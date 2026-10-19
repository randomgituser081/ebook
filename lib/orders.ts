// Server-only order store (Postgres `orders` table). One row per checkout; rows with
// paid_at set are the sales record shown in /admin. Every write is a single atomic statement,
// so the webhook and the polling page can race safely.
import { query } from "@/lib/db";

export type OrderRecord = {
  ref: string;
  bookId?: string;
  email?: string;
  name?: string;
  amountNaira?: number;
  createdAt: number;
  paidAt?: number;
  emailedAt?: number;
  downloads: number;
};

type OrderRow = {
  ref: string;
  book_id: string | null;
  email: string | null;
  name: string | null;
  amount_naira: number | null;
  created_at: number;
  paid_at: number | null;
  emailed_at: number | null;
  downloads: number;
};

function toOrder(row: OrderRow): OrderRecord {
  return {
    ref: row.ref,
    bookId: row.book_id ?? undefined,
    email: row.email ?? undefined,
    name: row.name ?? undefined,
    amountNaira: row.amount_naira ?? undefined,
    createdAt: row.created_at,
    paidAt: row.paid_at ?? undefined,
    emailedAt: row.emailed_at ?? undefined,
    downloads: row.downloads,
  };
}

export async function getOrder(ref: string): Promise<OrderRecord | undefined> {
  const { rows } = await query<OrderRow>("SELECT * FROM orders WHERE ref = $1", [ref]);
  return rows[0] && toOrder(rows[0]);
}

export async function listOrders(): Promise<OrderRecord[]> {
  const { rows } = await query<OrderRow>("SELECT * FROM orders ORDER BY COALESCE(paid_at, created_at) DESC");
  return rows.map(toOrder);
}

let lastPrune = 0;

/** Called when a checkout starts. */
export async function saveCheckout(
  ref: string,
  details: { bookId: string; email: string; name: string; amountNaira: number },
): Promise<void> {
  await query(
    `INSERT INTO orders (ref, book_id, email, name, amount_naira, created_at) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (ref) DO UPDATE SET book_id = EXCLUDED.book_id, email = EXCLUDED.email, name = EXCLUDED.name`,
    [ref, details.bookId, details.email, details.name, details.amountNaira, Date.now()],
  );

  // Abandoned checkouts older than 30 days are dropped (at most hourly); paid ones are kept forever.
  if (Date.now() - lastPrune > 60 * 60_000) {
    lastPrune = Date.now();
    await query("DELETE FROM orders WHERE paid_at IS NULL AND created_at < $1", [Date.now() - 30 * 24 * 3600_000]);
  }
}

/** Records the sale. Idempotent: the first paid_at wins. */
export async function markPaid(ref: string, details: { bookId: string; amountNaira: number }): Promise<void> {
  await query(
    `INSERT INTO orders (ref, book_id, amount_naira, created_at, paid_at) VALUES ($1,$2,$3,$4,$4)
     ON CONFLICT (ref) DO UPDATE SET
       book_id = EXCLUDED.book_id,
       amount_naira = EXCLUDED.amount_naira,
       paid_at = COALESCE(orders.paid_at, EXCLUDED.paid_at)`,
    [ref, details.bookId, details.amountNaira, Date.now()],
  );
}

export async function saveEmailIfMissing(ref: string, email: string): Promise<void> {
  await query("UPDATE orders SET email = $2 WHERE ref = $1 AND (email IS NULL OR email = '')", [ref, email]);
}

export async function markEmailed(ref: string, email: string): Promise<void> {
  await query("UPDATE orders SET emailed_at = $3, email = COALESCE(NULLIF(email, ''), $2) WHERE ref = $1", [
    ref,
    email,
    Date.now(),
  ]);
}

/** Confirmed purchases made with this email (case-insensitive), newest first. */
export async function listPaidOrdersByEmail(
  email: string,
): Promise<Array<{ ref: string; bookId: string; resends: number }>> {
  const { rows } = await query<{ ref: string; book_id: string; resends: number }>(
    `SELECT ref, book_id, resends FROM orders
     WHERE paid_at IS NOT NULL AND book_id IS NOT NULL AND lower(email) = lower($1)
     ORDER BY paid_at DESC LIMIT 20`,
    [email],
  );
  return rows.map((r) => ({ ref: r.ref, bookId: r.book_id, resends: r.resends }));
}

/**
 * Uses up one re-send for a purchase and gives its download allowance a fresh start.
 * Atomic, so two quick requests can't both slip past the limit.
 */
export async function claimResend(ref: string, maxResends: number): Promise<boolean> {
  const { rowCount } = await query(
    "UPDATE orders SET resends = resends + 1, downloads = 0 WHERE ref = $1 AND paid_at IS NOT NULL AND resends < $2",
    [ref, maxResends],
  );
  return rowCount > 0;
}

/** Gives re-sends back (used when the email couldn't be delivered, so the buyer isn't charged an attempt). */
export async function releaseResends(refs: string[]): Promise<void> {
  if (!refs.length) return;
  await query("UPDATE orders SET resends = GREATEST(resends - 1, 0) WHERE ref = ANY($1)", [refs]);
}

/** Checkouts that were started but not yet confirmed as paid (oldest first within the window). */
export async function listPendingRefs(
  minAgeMs: number,
  maxAgeMs: number,
  limit: number,
): Promise<Array<{ ref: string; createdAt: number }>> {
  const now = Date.now();
  const { rows } = await query<{ ref: string; created_at: number }>(
    `SELECT ref, created_at FROM orders
     WHERE paid_at IS NULL AND book_id IS NOT NULL AND created_at BETWEEN $1 AND $2
     ORDER BY created_at DESC LIMIT $3`,
    [now - maxAgeMs, now - minAgeMs, limit],
  );
  return rows.map((r) => ({ ref: r.ref, createdAt: r.created_at }));
}

/** Atomically counts a download; false once `max` has been reached. */
export async function consumeDownload(ref: string, max: number): Promise<boolean> {
  const { rowCount } = await query(
    `INSERT INTO orders (ref, created_at, downloads) VALUES ($1, $2, 1)
     ON CONFLICT (ref) DO UPDATE SET downloads = orders.downloads + 1 WHERE orders.downloads < $3`,
    [ref, Date.now(), max],
  );
  return rowCount > 0;
}
