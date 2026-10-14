import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/component/admin/AdminNav";
import { adminEnabled, isAdmin } from "@/lib/adminAuth";
import { listBooks } from "@/lib/books";
import { listOrders } from "@/lib/orders";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminOverviewPage() {
  if (!adminEnabled()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-heading-deep">Admin is not set up</h1>
        <p className="mt-3 text-gray-600">
          Set the <code className="rounded bg-glass-soft px-1.5 py-0.5">ADMIN_PASSWORD</code> environment variable and
          restart the server.
        </p>
      </main>
    );
  }
  if (!(await isAdmin())) redirect("/admin/login");

  const [books, orders] = await Promise.all([listBooks(), listOrders()]);
  const sales = orders.filter((o) => o.paidAt);
  const titles = new Map(books.map((b) => [b.id, b.title]));
  const revenue = sales.reduce((sum, o) => sum + (o.amountNaira ?? 0), 0);
  const unfinished = orders.length - sales.length;

  const perBook = new Map<string, { copies: number; revenue: number }>();
  for (const o of sales) {
    const row = perBook.get(o.bookId ?? "") ?? { copies: 0, revenue: 0 };
    row.copies += 1;
    row.revenue += o.amountNaira ?? 0;
    perBook.set(o.bookId ?? "", row);
  }

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white p-6">
            <p className="text-sm font-semibold text-gray-500">Total revenue</p>
            <p className="mt-2 text-3xl font-black text-heading-deep">{formatNaira(revenue)}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-6">
            <p className="text-sm font-semibold text-gray-500">Copies sold</p>
            <p className="mt-2 text-3xl font-black text-heading-deep">{sales.length}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-6">
            <p className="text-sm font-semibold text-gray-500">Unfinished checkouts (30 days)</p>
            <p className="mt-2 text-3xl font-black text-heading-deep">{unfinished}</p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-heading-deep">Books</h2>
            <Link
              href="/admin/books/new"
              className="rounded-full bg-[#995982] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#8e427d]"
            >
              + Add book
            </Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-black/5 text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Sold</th>
                  <th className="px-5 py-3 font-semibold">Revenue</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {books.map((book) => {
                  const stats = perBook.get(book.id) ?? { copies: 0, revenue: 0 };
                  return (
                    <tr key={book.id} className="border-b border-black/5 last:border-0">
                      <td className="px-5 py-4 font-semibold text-heading-deep">{book.title}</td>
                      <td className="px-5 py-4">{formatNaira(book.priceNaira)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            book.published ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {book.published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-5 py-4">{stats.copies}</td>
                      <td className="px-5 py-4">{formatNaira(stats.revenue)}</td>
                      <td className="px-5 py-4 text-right">
                        {book.published && (
                          <a href={`/books/${book.slug}`} target="_blank" rel="noreferrer" className="mr-4 text-gray-500 hover:text-brand">
                            View
                          </a>
                        )}
                        <Link href={`/admin/books/${book.id}`} className="font-semibold text-brand hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-heading-deep">Sales record</h2>
            {sales.length > 0 && (
              <a href="/api/admin/sales.csv" className="text-sm font-semibold text-brand hover:underline">
                Export CSV
              </a>
            )}
          </div>
          {sales.length === 0 ? (
            <p className="rounded-2xl border border-black/5 bg-white p-8 text-center text-gray-500">
              No sales yet. Completed purchases will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-black/5 text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Book</th>
                    <th className="px-5 py-3 font-semibold">Buyer</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Emailed</th>
                    <th className="px-5 py-3 font-semibold">Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((o) => (
                    <tr key={o.ref} className="border-b border-black/5 last:border-0">
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">{dateFormatter.format(o.paidAt)}</td>
                      <td className="px-5 py-4 font-semibold text-heading-deep">{titles.get(o.bookId ?? "") ?? "—"}</td>
                      <td className="px-5 py-4">
                        <div>{o.name ?? "—"}</div>
                        <div className="text-xs text-gray-500">{o.email ?? ""}</div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">{formatNaira(o.amountNaira ?? 0)}</td>
                      <td className="px-5 py-4">{o.emailedAt ? "Yes" : <span className="text-amber-600">No</span>}</td>
                      <td className="px-5 py-4">{o.downloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
