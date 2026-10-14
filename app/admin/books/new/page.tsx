import { redirect } from "next/navigation";
import { AdminNav } from "@/component/admin/AdminNav";
import { BookForm } from "@/component/admin/BookForm";
import { isAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function NewBookPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-black text-heading-deep">Add a book</h1>
        <BookForm />
      </main>
    </>
  );
}
