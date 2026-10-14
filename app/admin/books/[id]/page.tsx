import { notFound, redirect } from "next/navigation";
import { AdminNav } from "@/component/admin/AdminNav";
import { BookForm } from "@/component/admin/BookForm";
import { isAdmin } from "@/lib/adminAuth";
import { getBook } from "@/lib/books";

export const dynamic = "force-dynamic";

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");

  const book = await getBook((await params).id);
  if (!book) notFound();

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-black text-heading-deep">Edit book</h1>
        <BookForm book={book} />
      </main>
    </>
  );
}
