"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/lib/books";

const field =
  "w-full rounded-xl border border-glass bg-white px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-heading-deep">
      {children} {hint && <span className="font-normal text-gray-400">{hint}</span>}
    </label>
  );
}

export function BookForm({ book }: { book?: Book }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editing = Boolean(book);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await fetch(editing ? `/api/admin/books/${book!.id}` : "/api/admin/books", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not save the book.");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error — if you uploaded a large PDF, check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 rounded-3xl border border-black/5 bg-white p-6 sm:p-8">
      <div>
        <Label htmlFor="title">Title</Label>
        <input id="title" name="title" required defaultValue={book?.title} className={field} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="author">Author</Label>
          <input id="author" name="author" defaultValue={book?.author} className={field} />
        </div>
        <div>
          <Label htmlFor="pages" hint="(optional)">Pages</Label>
          <input id="pages" name="pages" type="number" min={1} defaultValue={book?.pages ?? ""} className={field} />
        </div>
      </div>

      <div>
        <Label htmlFor="subtitle" hint="(one line shown under the title)">Subtitle</Label>
        <input id="subtitle" name="subtitle" defaultValue={book?.subtitle} className={field} />
      </div>

      <div>
        <Label htmlFor="description" hint="(blank line between paragraphs)">About this book</Label>
        <textarea id="description" name="description" rows={6} defaultValue={book?.description} className={field} />
      </div>

      <div>
        <Label htmlFor="highlights" hint="(one per line — what the reader gets)">Highlights</Label>
        <textarea
          id="highlights"
          name="highlights"
          rows={5}
          defaultValue={book?.highlights.join("\n")}
          className={field}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="priceNaira" hint="(₦)">Price</Label>
          <input
            id="priceNaira"
            name="priceNaira"
            type="number"
            min={100}
            step={1}
            required
            defaultValue={book?.priceNaira}
            className={field}
          />
        </div>
        <div>
          <Label htmlFor="compareAtNaira" hint="(₦, optional — shown struck through)">Original price</Label>
          <input
            id="compareAtNaira"
            name="compareAtNaira"
            type="number"
            min={100}
            step={1}
            defaultValue={book?.compareAtNaira ?? ""}
            className={field}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="pdf" hint={editing ? "(leave empty to keep the current file)" : undefined}>
            Book file (PDF)
          </Label>
          <input id="pdf" name="pdf" type="file" accept="application/pdf" required={!editing} className={field} />
        </div>
        <div>
          <Label htmlFor="cover" hint="(PNG / JPG / WEBP, optional)">Cover image</Label>
          <input id="cover" name="cover" type="file" accept="image/png,image/jpeg,image/webp" className={field} />
          {book?.hasCover && <p className="mt-1 text-xs text-gray-500">A cover is already uploaded.</p>}
        </div>
      </div>

      <label className="flex items-center gap-3 text-base text-gray-700">
        <input
          type="checkbox"
          name="published"
          defaultChecked={book ? book.published : true}
          className="size-5 accent-[#995982]"
        />
        Published (visible in the store)
      </label>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="h-12 rounded-2xl bg-[#995982] px-8 font-bold text-white transition hover:bg-[#8e427d] disabled:opacity-60"
        >
          {busy ? "Saving…" : editing ? "Save changes" : "Add book"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="h-12 rounded-2xl border border-glass px-6 font-semibold text-gray-700 hover:bg-glass-soft"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
