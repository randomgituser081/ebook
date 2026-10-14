"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminNav() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <header className="border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-lg font-black text-heading-deep">
            Bookstore admin
          </Link>
          <Link href="/admin/books/new" className="text-sm font-semibold text-gray-600 hover:text-brand">
            Add book
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className="text-sm font-semibold text-gray-600 hover:text-brand">
            View store
          </a>
        </div>
        <button type="button" onClick={logout} className="text-sm font-semibold text-brand hover:underline">
          Sign out
        </button>
      </div>
    </header>
  );
}
