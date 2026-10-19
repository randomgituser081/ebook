import type { CSSProperties } from "react";
import type { Book } from "@/lib/books";

export type CoverBook = Pick<Book, "id" | "title" | "author" | "hasCover" | "updatedAt">;

/**
 * Front cover art: the uploaded image, or a designed fallback with the title.
 * `width` is the size (in px) the cover is requested at — the server resizes it, so small
 * thumbnails don't download full-size images.
 */
export function CoverArt({ book, width = 480 }: { book: CoverBook; width?: number }) {
  if (book.hasCover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/books/${book.id}/cover?v=${book.updatedAt}&w=${width}`}
        alt={`Cover of ${book.title}`}
        className="h-full w-full object-cover"
        width={width}
        height={Math.round(width * (4 / 3))}
        decoding="async"
        draggable={false}
      />
    );
  }
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-[#5b2a4a] via-[#8e427d] to-[#a14f5b] p-[9%]">
      <div className="absolute -right-1/4 -top-1/4 h-2/3 w-2/3 rounded-full bg-white/10 blur-2xl" />
      <span className="relative text-[clamp(8px,1.6cqw+4px,12px)] font-bold uppercase tracking-[0.25em] text-white/70">
        Maekandex
      </span>
      <h3 className="relative mt-[12%] text-[clamp(14px,9cqw,34px)] font-black leading-[1.05] text-white">{book.title}</h3>
      <div className="relative mt-[8%] h-1 w-[22%] rounded-full bg-academy-discount" />
      <p className="relative mt-auto text-[clamp(9px,4.5cqw,14px)] font-semibold text-white/80">{book.author}</p>
    </div>
  );
}

/**
 * A physical-looking book: cover, spine, page block and back, in real 3D.
 * Pure markup — safe in server components. TiltBook adds the interaction.
 */
export function Book3D({
  book,
  thickness = 26,
  style,
  className = "",
  glare = false,
  coverWidth = 480,
}: {
  book: CoverBook;
  thickness?: number;
  style?: CSSProperties;
  className?: string;
  glare?: boolean;
  coverWidth?: number;
}) {
  return (
    <div className={`book3d [container-type:inline-size] ${className}`} style={{ ["--t" as string]: `${thickness}px`, ...style }}>
      <div className="book3d__spine" />
      <div className="book3d__pages" />
      <div className="book3d__face book3d__back" />
      <div className="book3d__face book3d__front">
        <CoverArt book={book} width={coverWidth} />
        {glare && <div className="book3d__glare" />}
      </div>
    </div>
  );
}
