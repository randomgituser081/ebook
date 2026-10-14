# Maekandex Bookstore

Standalone Next.js app for **bookstore.maekandex.com** — sells ebooks, paid through Nomba,
delivered by email (Lenhub), with an admin to post books and see sales. Data lives in Postgres.

## Pages

| Path | What |
| --- | --- |
| `/` | Storefront — all published books |
| `/books/<slug>` | A book's landing page + checkout |
| `/thank-you` | After payment: confirms with Nomba, shows the download |
| `/admin` | Overview: revenue, books, **sales record** (+ CSV export) |
| `/admin/books/new`, `/admin/books/<id>` | Post / edit a book (PDF, cover, price, publish) |

## Data (Postgres)

Set `DATABASE_URL`. Tables are created automatically on first start (`lib/db.ts`), inside their own
Postgres schema (`DATABASE_SCHEMA`, default `bookstore`) so they never mix with other apps' tables:

| Table | Holds |
| --- | --- |
| `books` | title, author, description, price, published… |
| `book_files` | each book's PDF and cover image (`bytea`) — kept apart so listing books stays light |
| `orders` | one row per checkout; rows with `paid_at` are the **sales record** |

Because the files are in the database too, backing up Postgres backs up everything — no volume to mount.

## How a purchase flows

1. Buyer submits name + email on a book page → `POST /api/ebook/checkout` creates a Nomba
   order. The price always comes from the database, never from the browser.
2. Buyer pays on Nomba and is sent back to `/thank-you?ref=…`.
3. That page polls `GET /api/ebook/verify`, which confirms with Nomba, **records the sale**,
   and emails a signed download link through Lenhub (once per order).
4. `POST /api/ebook/webhook` does the same when the buyer never returns to the page.

Download links last 7 days and work for 3 downloads (`EBOOK_MAX_DOWNLOADS`). No buyer logins.

## Run locally

```
createdb bookstore                 # or any empty Postgres database
copy .env.example .env.local       # set DATABASE_URL and ADMIN_PASSWORD at least
npm install
npm run dev
```

On an empty database in development one dummy book is added so the store isn't empty.
Without Nomba/Lenhub values the store and admin work; checkout reports "payments not available".

## Deploy on Coolify

1. **Database:** add a PostgreSQL resource (or create a `bookstore` database on the existing server).
2. **Application:** new resource → this GitHub repo, branch `main`, build pack **Dockerfile**, port **3000**,
   domain `bookstore.maekandex.com`. Health check: `GET /`.
3. **Environment variables:** `DATABASE_URL` (the database's *internal* connection URL), `ADMIN_PASSWORD`,
   `SITE_URL=https://bookstore.maekandex.com`, plus the Nomba/Lenhub values when you're ready.
4. Deploy, open `/admin`, sign in, and add the first book. Production starts with an empty store
   (the dummy book is only seeded in development).

Webhook URL to register in the Nomba dashboard: `https://bookstore.maekandex.com/api/ebook/webhook`
(only useful if the Nomba account's webhook isn't already pointed at another service —
the thank-you page also settles payments when the buyer returns).

## Security notes

- Admin is a single shared password (`ADMIN_PASSWORD`) → signed httpOnly cookie, 7 days, with
  login throttling. Keep `/admin` behind HTTPS.
- Uploaded files are validated by content (PDF / PNG / JPG / WEBP), not by file name.
- Order references embed the book id; only `MKX-BK-…` references from this store are honoured,
  since the Nomba account is shared with other products.
