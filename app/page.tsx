import Link from "next/link";
import { BookOpen, Download, Mail, ShieldCheck } from "lucide-react";
import { BookCover } from "@/component/BookCover";
import { Reveal } from "@/component/Reveal";
import { StoreFooter, StoreHeader } from "@/component/StoreHeader";
import { listBooks } from "@/lib/books";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookstorePage() {
  const books = await listBooks({ publishedOnly: true });

  return (
    <div className="bg-[color:var(--surface)] text-gray-900">
      <StoreHeader />

      <section className="relative overflow-hidden bg-plum-deep pb-20 pt-36 sm:pb-24 sm:pt-44">
        <div className="animate-orb-a absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand-magenta/40 blur-3xl" />
        <div className="animate-orb-b absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-brand/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              <BookOpen className="size-4" /> Maekandex Bookstore
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] text-white sm:text-6xl">
              Ebooks, delivered straight to your inbox
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
              Pay securely in Naira and get your book the moment payment is confirmed.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/75">
              <span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Secured by Nomba</span>
              <span className="flex items-center gap-2"><Mail className="size-4" /> Sent to your email</span>
              <span className="flex items-center gap-2"><Download className="size-4" /> Instant PDF download</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-3xl font-bold text-heading-deep sm:text-4xl">Available books</h2>

        {books.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-black/5 bg-white p-8 text-center text-gray-600">
            New books are on the way. Please check back soon.
          </p>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book, i) => (
              <Reveal key={book.id} delay={i * 0.06}>
                <Link
                  href={`/books/${book.slug}`}
                  className="group flex h-full flex-col rounded-3xl border border-black/5 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <BookCover book={book} className="mx-auto w-44" />
                  <h3 className="mt-8 text-xl font-bold text-heading-deep">{book.title}</h3>
                  {book.author && <p className="mt-1 text-sm text-gray-500">by {book.author}</p>}
                  {book.subtitle && <p className="mt-3 line-clamp-3 text-base text-gray-600">{book.subtitle}</p>}
                  <div className="mt-auto flex items-center justify-between pt-6">
                    <span className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-heading-deep">{formatNaira(book.priceNaira)}</span>
                      {book.compareAtNaira && (
                        <span className="text-sm text-gray-400 line-through">{formatNaira(book.compareAtNaira)}</span>
                      )}
                    </span>
                    <span className="rounded-full bg-[#995982] px-4 py-2 text-sm font-bold text-white transition group-hover:bg-[#8e427d]">
                      View book
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <StoreFooter />
    </div>
  );
}
