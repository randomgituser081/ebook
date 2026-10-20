"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";

/** Delete a book, behind a clear confirmation. Sold books get a stronger warning. */
export function DeleteBookButton({
  id,
  title,
  sold,
  redirectTo,
  large = false,
}: {
  id: string;
  title: string;
  sold: number;
  redirectTo?: string;
  large?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/books/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not delete the book.");
        setBusy(false);
        return;
      }
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          large
            ? "inline-flex items-center gap-2 rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 transition hover:bg-red-50"
            : "ml-4 font-semibold text-red-600 hover:underline"
        }
      >
        {large && <Trash2 className="size-4" />}
        Delete{large ? " this book" : ""}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`del-${id}`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 text-left"
          onClick={() => !busy && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <TriangleAlert className="size-6" />
            </div>
            <h2 id={`del-${id}`} className="mt-4 text-xl font-black text-heading-deep">
              Delete &ldquo;{title}&rdquo;?
            </h2>
            {sold > 0 ? (
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                <p>
                  This book has been bought <strong>{sold} time{sold > 1 ? "s" : ""}</strong>. If you delete it:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>those buyers&apos; download links and &ldquo;Find my purchase&rdquo; stop working for it;</li>
                  <li>the sales stay in your records, with the book&apos;s name.</li>
                </ul>
                <p>If you only want it off the shop, <strong>unpublish it</strong> instead (Edit → untick Published).</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">
                This permanently removes the book, its PDF and its cover. It can&apos;t be undone.
              </p>
            )}
            {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-xl border border-glass px-5 py-2.5 font-semibold text-gray-700 hover:bg-glass-soft disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? "Deleting…" : "Yes, delete it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
