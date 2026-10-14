import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Download, FileText, Smartphone } from "lucide-react";
import { AccordionItem } from "@/component/Accordion";
import { BookCover } from "@/component/BookCover";
import { BuyForm } from "@/component/BuyForm";
import { Reveal } from "@/component/Reveal";
import { StoreFooter, StoreHeader } from "@/component/StoreHeader";
import { getBookBySlug, type Book } from "@/lib/books";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

const FAQS = [
  {
    question: "How do I get the book after paying?",
    answer:
      "As soon as Nomba confirms your payment you're taken to a download page, and we also email the download link to the address you entered at checkout. Check your spam folder if it doesn't show up.",
  },
  {
    question: "What payment methods can I use?",
    answer: "Checkout is handled by Nomba, so you can pay with your debit card, bank transfer or USSD. Prices are in Naira.",
  },
  {
    question: "Can I read it on my phone?",
    answer: "Yes. The book is a PDF that opens on any phone, tablet or computer.",
  },
  {
    question: "I paid but didn't get my download. What now?",
    answer:
      "Transfers can take a few minutes to confirm. Keep the download page open and it will update automatically. If it still doesn't arrive, contact us with your payment reference and we'll sort it out.",
  },
];

async function publishedBook(slug: string): Promise<Book | undefined> {
  const book = await getBookBySlug(slug);
  return book?.published ? book : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const book = await publishedBook((await params).slug);
  if (!book) return { title: "Book not found" };
  return {
    title: book.title,
    description: book.subtitle || book.description.slice(0, 160),
    openGraph: { title: book.title, description: book.subtitle || undefined },
  };
}

function PriceTag({ book, light = false }: { book: Book; light?: boolean }) {
  const discount = book.compareAtNaira ? Math.round((1 - book.priceNaira / book.compareAtNaira) * 100) : 0;
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className={`text-4xl font-black ${light ? "text-white" : "text-heading-deep"}`}>
        {formatNaira(book.priceNaira)}
      </span>
      {book.compareAtNaira && (
        <>
          <span className={`text-lg line-through ${light ? "text-white/60" : "text-gray-400"}`}>
            {formatNaira(book.compareAtNaira)}
          </span>
          <span className="rounded-full bg-academy-discount px-2.5 py-0.5 text-xs font-bold text-academy-discount-fg">
            {discount}% off
          </span>
        </>
      )}
    </div>
  );
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const book = await publishedBook((await params).slug);
  if (!book) notFound();

  const paragraphs = book.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="bg-[color:var(--surface)] text-gray-900">
      <StoreHeader cta={{ href: "#buy", label: "Get the book" }} />

      <section className="relative overflow-hidden bg-plum-deep pb-20 pt-32 sm:pb-28 sm:pt-40">
        <div className="animate-orb-a absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand-magenta/40 blur-3xl" />
        <div className="animate-orb-b absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-brand/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
              <ArrowLeft className="size-4" /> All books
            </Link>
            <span className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              <BookOpen className="size-4" /> Ebook
            </span>
            <h1 className="text-4xl font-black leading-[1.05] text-white sm:text-6xl">{book.title}</h1>
            {book.subtitle && <p className="mt-6 max-w-xl text-lg text-white/80 sm:text-xl">{book.subtitle}</p>}
            {book.author && <p className="mt-4 text-base font-semibold text-white/70">by {book.author}</p>}

            <div className="mt-8">
              <PriceTag book={book} light />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#buy"
                className="inline-flex items-center gap-2 rounded-full bg-[#995982] px-7 py-4 text-base font-bold text-white transition hover:bg-[#8e427d]"
              >
                Buy now — instant delivery
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/70">
              {book.pages && (
                <span className="flex items-center gap-2"><FileText className="size-4" /> {book.pages} pages</span>
              )}
              <span className="flex items-center gap-2"><Download className="size-4" /> PDF download</span>
              <span className="flex items-center gap-2"><Smartphone className="size-4" /> Read on any device</span>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="mx-auto w-full max-w-[320px]">
            <BookCover book={book} />
          </Reveal>
        </div>
      </section>

      {book.highlights.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold text-heading-deep sm:text-4xl">What you&apos;ll get</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {book.highlights.map((item, i) => (
              <Reveal key={`${i}-${item}`} delay={i * 0.05}>
                <div className="flex h-full items-start gap-3 rounded-2xl border border-black/5 bg-white p-5">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand" />
                  <span className="text-base text-gray-700">{item}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {paragraphs.length > 0 && (
        <section className="bg-glass-soft py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Reveal>
              <h2 className="text-center text-3xl font-bold text-heading-deep sm:text-4xl">About this book</h2>
              <div className="mt-8 space-y-5 text-lg leading-relaxed text-gray-700">
                {paragraphs.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">{p}</p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section id="buy" className="scroll-mt-6 bg-plum-deep py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-black text-white sm:text-4xl">Get your copy today</h2>
            <p className="mt-4 text-lg text-white/80">
              Pay securely with card, bank transfer or USSD. Your book is emailed to you the moment payment is confirmed.
            </p>
            <div className="mt-6">
              <PriceTag book={book} light />
            </div>
            <ul className="mt-6 space-y-2 text-base text-white/80">
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> PDF, readable on any device</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> Download link sent to your email</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" /> Secure payment by Nomba</li>
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-bold text-heading-deep">Checkout</span>
                <span className="flex items-center gap-2 rounded-full bg-[#0C0C0C] px-3 py-1.5 text-sm font-bold text-white">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  nomba
                </span>
              </div>
              <BuyForm bookId={book.id} priceNaira={book.priceNaira} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-heading-deep sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-10 space-y-4">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.question} title={faq.question}>
              {faq.answer}
            </AccordionItem>
          ))}
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}
