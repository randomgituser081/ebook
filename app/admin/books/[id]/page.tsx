import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/component/admin/AdminNav";
import { BookForm } from "@/component/admin/BookForm";
import { DeleteBookButton } from "@/component/admin/DeleteBookButton";
import { isAdmin } from "@/lib/adminAuth";
import { getBook } from "@/lib/books";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const book = await getBook((await params).id);
  if (!book) notFound();
  const sold = (await listOrders()).filter((o) => o.bookId === book.id && o.paidAt).length;

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-black text-heading-deep">Edit book</h1>
        <BookForm book={book} />

        <section className="mt-8 rounded-3xl border border-red-100 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-red-700">Delete this book</h2>
          <p className="mb-4 mt-1 text-sm text-gray-600">
            Removes the book, its PDF and its cover from the store for good. To just hide it, untick Published above.
          </p>
          <DeleteBookButton id={book.id} title={book.title} sold={sold} redirectTo="/admin" large />
        </section>
      </main>
    </>
  );
}
