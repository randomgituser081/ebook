import type { Book } from "@/lib/books";

type CoverBook = Pick<Book, "id" | "title" | "author" | "hasCover" | "updatedAt">;

// Uses the uploaded cover when there is one, otherwise a CSS-drawn cover.
export function BookCover({ book, className = "" }: { book: CoverBook; className?: string }) {
  return (
    <div className={`relative [perspective:1200px] ${className}`}>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-r-2xl rounded-l-md shadow-[24px_30px_60px_-20px_rgba(59,29,48,0.65)] [transform:rotateY(-14deg)] [transform-style:preserve-3d]">
        {book.hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/books/${book.id}/cover?v=${book.updatedAt}`}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col bg-gradient-to-br from-[#5b2a4a] via-[#8e427d] to-[#a14f5b] p-7">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/70">Maekandex Bookstore</span>
            <h3 className="mt-6 text-2xl font-black leading-tight text-white sm:text-3xl">{book.title}</h3>
            <div className="mt-4 h-1 w-14 rounded-full bg-academy-discount" />
            <p className="mt-auto text-sm font-semibold text-white/80">{book.author}</p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-black/25" />
      </div>
    </div>
  );
}
