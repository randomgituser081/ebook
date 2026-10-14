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

/** Atomically counts a download; false once `max` has been reached. */
export async function consumeDownload(ref: string, max: number): Promise<boolean> {
  const { rowCount } = await query(
    `INSERT INTO orders (ref, created_at, downloads) VALUES ($1, $2, 1)
     ON CONFLICT (ref) DO UPDATE SET downloads = orders.downloads + 1 WHERE orders.downloads < $3`,
    [ref, Date.now(), max],
  );
  return rowCount > 0;
}
