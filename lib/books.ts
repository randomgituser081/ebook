// Server-only book catalogue, managed from /admin and stored in Postgres
// (book details in `books`, the PDF and cover image in `book_files`).
import { randomBytes } from "crypto";
import { query, withTransaction } from "@/lib/db";

export type Book = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  highlights: string[];
  priceNaira: number;
  compareAtNaira: number | null;
  pages: number | null;
  hasCover: boolean;
  published: boolean;
  createdAt: number;
  updatedAt: number;
};

export type BookInput = Pick<
  Book,
  "title" | "subtitle" | "author" | "description" | "highlights" | "priceNaira" | "compareAtNaira" | "pages" | "published"
>;

export type BookFiles = {
  pdf?: Buffer;
  cover?: { data: Buffer; type: "image/png" | "image/jpeg" | "image/webp" };
};

type BookRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  description: string;
  highlights: string[];
  price_naira: number;
  compare_at_naira: number | null;
  pages: number | null;
  has_cover: boolean;
  published: boolean;
  created_at: number;
  updated_at: number;
};

const SELECT_BOOK = `
  SELECT b.*, EXISTS (SELECT 1 FROM book_files f WHERE f.book_id = b.id AND f.cover IS NOT NULL) AS has_cover
  FROM books b`;

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    description: row.description,
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    priceNaira: row.price_naira,
    compareAtNaira: row.compare_at_naira,
    pages: row.pages,
    hasCover: row.has_cover,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The catalogue is tiny and changes rarely, but every page view needs it — and the database is
// on another server. So it's kept in memory: served instantly, refreshed in the background once
// it is a minute old, and reloaded immediately whenever the admin saves a book (this process).
const CATALOGUE_TTL_MS = 60_000;
let catalogue: { at: number; books: Book[] } | null = null;
let loading: Promise<Book[]> | null = null;

function loadCatalogue(): Promise<Book[]> {
  loading ??= query<BookRow>(`${SELECT_BOOK} ORDER BY b.created_at DESC`)
    .then(({ rows }) => {
      const books = rows.map(toBook);
      catalogue = { at: Date.now(), books };
      return books;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

async function allBooks(): Promise<Book[]> {
  if (!catalogue) return loadCatalogue(); // first request after start: wait for it
  if (Date.now() - catalogue.at > CATALOGUE_TTL_MS) void loadCatalogue().catch(() => undefined); // refresh behind the scenes
  return catalogue.books;
}

export async function listBooks(opts: { publishedOnly?: boolean } = {}): Promise<Book[]> {
  const books = await allBooks();
  return opts.publishedOnly ? books.filter((b) => b.published) : books;
}

export async function getBook(id: string): Promise<Book | undefined> {
  return (await allBooks()).find((b) => b.id === id);
}

export async function getBookBySlug(slug: string): Promise<Book | undefined> {
  return (await allBooks()).find((b) => b.slug === slug);
}

// ---- Files ------------------------------------------------------------------

export async function bookPdfSize(id: string): Promise<number | null> {
  const { rows } = await query<{ size: number | null }>(
    "SELECT octet_length(pdf) AS size FROM book_files WHERE book_id = $1",
    [id],
  );
  return rows[0]?.size ?? null;
}

export async function getBookPdf(id: string): Promise<Buffer | null> {
  const { rows } = await query<{ pdf: Buffer | null }>("SELECT pdf FROM book_files WHERE book_id = $1", [id]);
  return rows[0]?.pdf ?? null;
}

export async function getBookCover(id: string): Promise<{ data: Buffer; type: string } | null> {
  const { rows } = await query<{ cover: Buffer | null; cover_type: string | null }>(
    "SELECT cover, cover_type FROM book_files WHERE book_id = $1",
    [id],
  );
  const row = rows[0];
  return row?.cover ? { data: row.cover, type: row.cover_type ?? "image/png" } : null;
}

// ---- Writes -----------------------------------------------------------------

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "book";
}

async function uniqueSlug(title: string, ownId?: string): Promise<string> {
  const base = slugify(title);
  const { rows } = await query<{ slug: string }>(
    "SELECT slug FROM books WHERE (slug = $1 OR slug LIKE $1 || '-%') AND id <> $2",
    [base, ownId ?? ""],
  );
  const taken = new Set(rows.map((r) => r.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

async function saveFiles(
  client: { query: (text: string, params: unknown[]) => Promise<unknown> },
  id: string,
  files: BookFiles,
): Promise<void> {
  if (!files.pdf && !files.cover) return;
  await client.query(
    `INSERT INTO book_files (book_id, pdf, cover, cover_type) VALUES ($1, $2, $3, $4)
     ON CONFLICT (book_id) DO UPDATE SET
       pdf        = COALESCE(EXCLUDED.pdf, book_files.pdf),
       cover      = COALESCE(EXCLUDED.cover, book_files.cover),
       cover_type = COALESCE(EXCLUDED.cover_type, book_files.cover_type)`,
    [id, files.pdf ?? null, files.cover?.data ?? null, files.cover?.type ?? null],
  );
}

export async function createBook(input: BookInput, files: BookFiles & { pdf: Buffer }): Promise<Book> {
  const id = randomBytes(5).toString("hex");
  const slug = await uniqueSlug(input.title);
  const now = Date.now();

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO books (id, slug, title, subtitle, author, description, highlights, price_naira, compare_at_naira, pages, published, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)`,
      [
        id,
        slug,
        input.title,
        input.subtitle,
        input.author,
        input.description,
        JSON.stringify(input.highlights),
        input.priceNaira,
        input.compareAtNaira,
        input.pages,
        input.published,
        now,
      ],
    );
    await saveFiles(client, id, files);
  });

  await loadCatalogue();
  return (await getBook(id))!;
}

export async function updateBook(id: string, input: BookInput, files: BookFiles = {}): Promise<Book | null> {
  if (!(await loadCatalogue()).some((b) => b.id === id)) return null;
  const slug = await uniqueSlug(input.title, id);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE books SET slug=$2, title=$3, subtitle=$4, author=$5, description=$6, highlights=$7,
              price_naira=$8, compare_at_naira=$9, pages=$10, published=$11, updated_at=$12
       WHERE id=$1`,
      [
        id,
        slug,
        input.title,
        input.subtitle,
        input.author,
        input.description,
        JSON.stringify(input.highlights),
        input.priceNaira,
        input.compareAtNaira,
        input.pages,
        input.published,
        Date.now(),
      ],
    );
    await saveFiles(client, id, files);
  });

  await loadCatalogue();
  return (await getBook(id)) ?? null;
}
