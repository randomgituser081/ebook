// Server-only Postgres access. One shared pool; tables are created automatically on first
// use (idempotent, guarded by an advisory lock so several instances can start together).
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// bigint (int8) columns hold millisecond timestamps — comfortably inside Number's range.
types.setTypeParser(20, (value) => Number(value));

type Globals = typeof globalThis & { __bookstorePool?: Pool; __bookstoreReady?: Promise<void> };
const g = globalThis as Globals;

const MIGRATION_LOCK_KEY = 727_001;

// All tables live in their own schema, so the bookstore can safely share a database with other apps.
const SCHEMA = process.env.DATABASE_SCHEMA || "bookstore";
if (!/^[a-z_][a-z0-9_]*$/.test(SCHEMA)) {
  throw new Error(`DATABASE_SCHEMA "${SCHEMA}" is not a valid schema name (lowercase letters, digits, underscores).`);
}

const MIGRATIONS: Array<{ id: string; sql: string }> = [
  {
    id: "001_initial",
    sql: `
      CREATE TABLE books (
        id               text PRIMARY KEY,
        slug             text NOT NULL UNIQUE,
        title            text NOT NULL,
        subtitle         text NOT NULL DEFAULT '',
        author           text NOT NULL DEFAULT '',
        description      text NOT NULL DEFAULT '',
        highlights       jsonb NOT NULL DEFAULT '[]',
        price_naira      integer NOT NULL CHECK (price_naira >= 0),
        compare_at_naira integer,
        pages            integer,
        published        boolean NOT NULL DEFAULT true,
        created_at       bigint NOT NULL,
        updated_at       bigint NOT NULL
      );

      -- Files live apart from the book row so listing books never loads the PDFs.
      CREATE TABLE book_files (
        book_id    text PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
        pdf        bytea,
        cover      bytea,
        cover_type text
      );

      -- One row per checkout; paid rows are the sales record.
      CREATE TABLE orders (
        ref          text PRIMARY KEY,
        book_id      text,
        email        text,
        name         text,
        amount_naira integer,
        created_at   bigint NOT NULL,
        paid_at      bigint,
        emailed_at   bigint,
        downloads    integer NOT NULL DEFAULT 0
      );
      CREATE INDEX orders_paid_at_idx ON orders (paid_at DESC) WHERE paid_at IS NOT NULL;
    `,
  },
  {
    id: "002_resend_links",
    sql: `
      ALTER TABLE orders ADD COLUMN resends integer NOT NULL DEFAULT 0;
      CREATE INDEX orders_email_idx ON orders (lower(email)) WHERE paid_at IS NOT NULL;
    `,
  },
  {
    id: "003_order_book_title",
    sql: `
      ALTER TABLE orders ADD COLUMN book_title text;
    `,
  },
];

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — add your Postgres connection string to the environment.");
  }
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX) || 5,
    // The database is on another host: keep sockets alive and recycle idle ones before
    // a firewall/NAT silently drops them.
    keepAlive: true,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    // Every connection starts in the bookstore schema (a startup parameter, so no extra query).
    options: `-c search_path=${SCHEMA}`,
  });
  pool.on("error", (error) => console.error("[db] idle client error:", error.message));
  return pool;
}

function rawPool(): Pool {
  return (g.__bookstorePool ??= createPool());
}

async function migrate(): Promise<void> {
  const client = await rawPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at bigint NOT NULL)",
    );
    const done = new Set((await client.query<{ id: string }>("SELECT id FROM schema_migrations")).rows.map((r) => r.id));

    for (const migration of MIGRATIONS) {
      if (done.has(migration.id)) continue;
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)", [migration.id, Date.now()]);
        await client.query("COMMIT");
        console.log(`[db] applied migration ${migration.id}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    await seedDemoBook(client);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}

// Local development only: one placeholder book so the store isn't empty. Never in production
// unless SEED_DEMO_BOOK=true, and only once (a marker row stops it coming back after you delete it).
async function seedDemoBook(client: PoolClient): Promise<void> {
  const enabled =
    process.env.SEED_DEMO_BOOK === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.SEED_DEMO_BOOK !== "false");
  if (!enabled) return;

  const marker = "seed_demo_book";
  const seeded = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [marker]);
  if (seeded.rowCount) return;

  const { count } = (await client.query<{ count: string }>("SELECT count(*) FROM books")).rows[0];
  if (Number(count) === 0) {
    const [{ readFile }, path] = await Promise.all([import("fs/promises"), import("path")]);
    const pdf = await readFile(path.join(process.cwd(), "private", "ebook", "the-african-product-playbook.pdf")).catch(
      () => null,
    );
    const now = Date.now();
    await client.query(
      `INSERT INTO books (id, slug, title, subtitle, author, description, highlights, price_naira, compare_at_naira, pages, published, created_at, updated_at)
       VALUES ('demo', 'the-african-product-playbook', 'The African Product Playbook',
               'How to take a digital product from idea to paying customers.', 'Maekandex Communications Limited',
               $1, $2, 15000, 25000, 180, true, $3, $3)`,
      [
        "A practical guide drawn from real product builds across Africa.\n\nThis is placeholder text. Replace it with the real book from the admin dashboard.",
        JSON.stringify([
          "Validate an idea before you build it",
          "Plan an MVP you can ship in weeks",
          "Collect payments online in Nigeria",
          "Launch and grow on a startup budget",
        ]),
        now,
      ],
    );
    if (pdf) await client.query("INSERT INTO book_files (book_id, pdf) VALUES ('demo', $1)", [pdf]);
    console.log("[db] seeded the demo book (development only)");
  }
  await client.query("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
    marker,
    Date.now(),
  ]);
}

function ready(): Promise<void> {
  g.__bookstoreReady ??= migrate().catch((error) => {
    g.__bookstoreReady = undefined; // let the next request retry
    throw error;
  });
  return g.__bookstoreReady;
}

// A dropped connection (not a bad query) — safe to retry once on a fresh connection.
function isConnectionError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return (
    ["ECONNRESET", "EPIPE", "ETIMEDOUT", "ECONNREFUSED", "57P01", "08000", "08003", "08006"].includes(e?.code ?? "") ||
    /Connection terminated|connection.*closed/i.test(e?.message ?? "")
  );
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  await ready();
  try {
    const result = await rawPool().query<T>(text, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (error) {
    if (!isConnectionError(error)) throw error;
    console.warn("[db] connection dropped, retrying once:", (error as Error).message);
    const result = await rawPool().query<T>(text, params);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ready();
  const client = await rawPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
