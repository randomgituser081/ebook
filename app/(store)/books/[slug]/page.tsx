import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Download,
  FileText,
  Mail,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { AccordionItem } from "@/component/Accordion";
import { Book3D } from "@/component/Book3D";
import { BuyForm } from "@/component/BuyForm";
import { Magnetic, Reveal, ScrollProgress, Stagger, StaggerItem } from "@/component/motion";
import { Rise, TextReveal } from "@/component/TextReveal";
import { SiteFooter } from "@/component/SiteFooter";
import { SiteHeader } from "@/component/SiteHeader";
import { MobileBuyBar } from "@/component/store/MobileBuyBar";
import { TiltBook } from "@/component/TiltBook";
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

function discountOf(book: Book): number {
  return book.compareAtNaira ? Math.round((1 - book.priceNaira / book.compareAtNaira) * 100) : 0;
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const book = await publishedBook((await params).slug);
  if (!book) notFound();

  const paragraphs = book.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const discount = discountOf(book);

  return (
    <div className="bg-[color:var(--surface)] text-gray-900">
      <ScrollProgress />
      <SiteHeader cta={{ href: "#buy", label: "Get the book" }} />

      {/* ---------- Hero ---------- */}
      <section className="grain relative isolate overflow-hidden bg-[#1c0b16] pb-20 pt-28 sm:pt-36 lg:pb-28">
        <div className="animate-orb-a absolute -left-40 -top-10 -z-10 h-[36rem] w-[36rem] rounded-full bg-brand-magenta/30 blur-[120px]" />
        <div className="animate-orb-b absolute -right-20 bottom-0 -z-10 h-[32rem] w-[32rem] rounded-full bg-brand/40 blur-[120px]" />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <Rise y={10}>
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white">
                <ArrowLeft className="size-4" /> All books
              </Link>
            </Rise>
            <Rise delay={0.05} y={10}>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                <BookOpen className="size-3.5 text-academy-discount" /> Ebook · PDF
              </span>
            </Rise>
            <TextReveal
              text={book.title}
              className="mt-5 text-[2.5rem] font-black leading-[1.03] tracking-tight text-white sm:text-6xl lg:text-7xl"
              delay={0.1}
            />
            {book.subtitle && (
              <Rise delay={0.4} y={14}>
                <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl lg:mx-0">{book.subtitle}</p>
              </Rise>
            )}
            {book.author && (
              <Rise delay={0.5} y={10}>
                <p className="mt-4 inline-flex items-center gap-2 text-base font-semibold text-white/80">
                  <User className="size-4 text-academy-discount" /> by {book.author}
                </p>
              </Rise>
            )}

            <Rise delay={0.6} y={14}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <span className="text-5xl font-black text-white">{formatNaira(book.priceNaira)}</span>
                {book.compareAtNaira && (
                  <>
                    <span className="text-xl text-white/40 line-through">{formatNaira(book.compareAtNaira)}</span>
                    <span className="rounded-full bg-academy-discount px-3 py-1 text-sm font-black text-academy-discount-fg">
                      Save {discount}%
                    </span>
                  </>
                )}
              </div>
            </Rise>

            <Rise delay={0.7} y={14}>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Magnetic>
                  <a
                    href="#buy"
                    className="group inline-flex items-center gap-2 rounded-full bg-academy-discount px-8 py-4 text-base font-bold text-academy-discount-fg shadow-[0_15px_40px_-10px_rgba(232,163,61,0.6)] transition hover:bg-white"
                  >
                    Buy now — instant delivery <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Magnetic>
                {book.highlights.length > 0 && (
                  <a href="#inside" className="px-4 py-3 font-semibold text-white/75 transition hover:text-white">
                    What&apos;s inside
                  </a>
                )}
              </div>
            </Rise>

            <Rise delay={0.85} y={8}>
              <div className="mt-10 flex flex-wrap justify-center gap-2 lg:justify-start">
                {[
                  book.pages ? { icon: FileText, text: `${book.pages} pages` } : null,
                  { icon: Download, text: "PDF download" },
                  { icon: Smartphone, text: "Any device" },
                  { icon: Mail, text: "Emailed to you" },
                ]
                  .filter(Boolean)
                  .map((chip) => {
                    const { icon: Icon, text } = chip!;
                    return (
                      <span key={text} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white/75">
                        <Icon className="size-4 text-academy-discount" /> {text}
                      </span>
                    );
                  })}
              </div>
            </Rise>
          </div>

          <div className="order-1 mx-auto w-[58%] max-w-[360px] sm:w-[42%] lg:order-2 lg:w-full">
            <TiltBook book={book} thickness={32} />
          </div>
        </div>
      </section>

      {/* ---------- Highlights ---------- */}
      {book.highlights.length > 0 && (
        <section id="inside" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Inside the book</p>
            <h2 className="mt-3 text-3xl font-black text-heading-deep sm:text-5xl">What you&apos;ll get</h2>
          </Reveal>
          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.07}>
            {book.highlights.map((item, i) => (
              <StaggerItem key={`${i}-${item}`}>
                <div className="group relative h-full overflow-hidden rounded-2xl bg-white p-6 ring-1 ring-black/5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(91,42,74,0.55)]">
                  <span aria-hidden className="absolute -bottom-4 right-3 text-7xl font-black leading-none text-heading-deep/[0.06] transition group-hover:text-brand/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <BadgeCheck className="relative size-7 text-brand" />
                  <p className="relative mt-4 text-base font-semibold leading-relaxed text-gray-800">{item}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* ---------- About ---------- */}
      {paragraphs.length > 0 && (
        <section className="bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[1.4fr_0.6fr]">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">About this book</p>
              <div className="mt-6 space-y-6 text-lg leading-[1.8] text-gray-700">
                {paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className={
                      i === 0
                        ? "flow-root whitespace-pre-line first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-7xl first-letter:font-black first-letter:leading-[0.8] first-letter:text-heading-deep"
                        : "whitespace-pre-line"
                    }
                  >
                    {p}
                  </p>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <dl className="sticky top-28 divide-y divide-black/5 rounded-2xl bg-[color:var(--surface)] p-6 ring-1 ring-black/5">
                {[
                  { label: "Author", value: book.author || "Maekandex" },
                  { label: "Format", value: "PDF ebook" },
                  book.pages ? { label: "Length", value: `${book.pages} pages` } : null,
                  { label: "Delivery", value: "Instant + email" },
                  { label: "Price", value: formatNaira(book.priceNaira) },
                ]
                  .filter(Boolean)
                  .map((row) => (
                    <div key={row!.label} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                      <dt className="text-sm text-gray-500">{row!.label}</dt>
                      <dd className="text-right text-sm font-bold text-heading-deep">{row!.value}</dd>
                    </div>
                  ))}
              </dl>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------- Checkout ---------- */}
      <section id="buy" className="grain relative isolate scroll-mt-20 overflow-hidden bg-[#1c0b16] py-20 sm:py-28">
        <div className="animate-orb-b absolute -left-24 top-1/3 -z-10 h-[28rem] w-[28rem] rounded-full bg-brand-magenta/30 blur-[110px]" />
        <div className="mx-auto grid max-w-5xl items-start gap-10 px-5 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-academy-discount">Checkout</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">Get your copy today</h2>
            <div className="mt-8 flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="book3d-scene w-16 shrink-0">
                <Book3D book={book} thickness={10} style={{ transform: "rotateY(-24deg)" }} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{book.title}</p>
                <p className="text-sm text-white/50">PDF ebook{book.author ? ` · ${book.author}` : ""}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              {book.compareAtNaira && (
                <>
                  <div className="flex justify-between text-white/60">
                    <dt>Original price</dt>
                    <dd className="line-through">{formatNaira(book.compareAtNaira)}</dd>
                  </div>
                  <div className="flex justify-between text-emerald-300">
                    <dt>You save</dt>
                    <dd>−{formatNaira(book.compareAtNaira - book.priceNaira)}</dd>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between border-t border-white/10 pt-4 text-white">
                <dt className="font-semibold">Total</dt>
                <dd className="text-3xl font-black">{formatNaira(book.priceNaira)}</dd>
              </div>
            </dl>
            <ul className="mt-8 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3"><ShieldCheck className="size-5 text-academy-discount" /> Card, bank transfer or USSD via Nomba</li>
              <li className="flex items-center gap-3"><Download className="size-5 text-academy-discount" /> Download right after payment</li>
              <li className="flex items-center gap-3"><Mail className="size-5 text-academy-discount" /> A copy of the link in your inbox</li>
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[1.75rem] bg-white p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-bold text-heading-deep">Your details</span>
                <span className="flex items-center gap-2 rounded-full bg-[#0C0C0C] px-3 py-1.5 text-xs font-bold text-white">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-400" /> nomba
                </span>
              </div>
              <BuyForm bookId={book.id} priceNaira={book.priceNaira} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mx-auto max-w-3xl px-5 py-20 sm:px-6 sm:py-28">
        <Reveal className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">Questions</p>
          <h2 className="mt-3 text-3xl font-black text-heading-deep sm:text-5xl">Good to know</h2>
        </Reveal>
        <Stagger className="mt-10 space-y-3" gap={0.06}>
          {FAQS.map((faq) => (
            <StaggerItem key={faq.question}>
              <AccordionItem title={faq.question}>{faq.answer}</AccordionItem>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <SiteFooter />

      <MobileBuyBar
        title={book.title}
        price={formatNaira(book.priceNaira)}
        compareAt={book.compareAtNaira ? formatNaira(book.compareAtNaira) : undefined}
      />
    </div>
  );
}
