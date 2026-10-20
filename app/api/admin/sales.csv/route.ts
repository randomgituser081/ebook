import { isAdmin } from "@/lib/adminAuth";
import { listBooks } from "@/lib/books";
import { listOrders } from "@/lib/orders";

export const runtime = "nodejs";

// Spreadsheets run cells starting with = + - @ as formulas; buyer names/emails are user input.
function cell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });

  const [orders, books] = await Promise.all([listOrders(), listBooks()]);
  const titles = new Map(books.map((b) => [b.id, b.title]));

  const rows = [["Date", "Reference", "Book", "Buyer", "Email", "Amount (NGN)", "Emailed", "Downloads"]];
  for (const o of orders.filter((o) => o.paidAt)) {
    rows.push([
      new Date(o.paidAt!).toISOString(),
      o.ref,
      titles.get(o.bookId ?? "") ?? o.bookTitle ?? o.bookId ?? "",
      o.name ?? "",
      o.email ?? "",
      String(o.amountNaira ?? ""),
      o.emailedAt ? "yes" : "no",
      String(o.downloads),
    ]);
  }

  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
