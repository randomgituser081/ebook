import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, CreditCard, Download, Mail, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { Book3D } from "@/component/Book3D";
import { Reveal, Stagger, StaggerItem } from "@/component/motion";
import { TiltBook } from "@/component/TiltBook";
import { DrawLine } from "@/component/store/DrawLine";
import type { Book } from "@/lib/books";
import { formatNaira } from "@/lib/format";

/** Up to three latest books, fanned out; the front one is interactive. */
export function HeroBooks({ books }: { books: Book[] }) {
  const [front, ...rest] = books.slice(0, 3);
  if (!front) {
    return (
      <div className="flex aspect-[3/4] w-full max-w-[300px] items-center justify-center rounded-2xl border border-dashed border-white/20 text-sm text-white/50">
        New books soon
      </div>
    );
  }
  return (
    <div className="relative mx-auto w-[46%] max-w-[330px] sm:w-[40%] lg:w-full">
      {rest.map((book, i) => (
        <div
          key={book.id}
          aria-hidden
          className="book3d-scene absolute inset-0 opacity-70"
          style={{ transform: `translateX(${(i + 1) * -22}%) translateY(${(i + 1) * 4}%) scale(${0.86 - i * 0.06})`, zIndex: -1 - i }}
        >
          <Book3D book={book} thickness={22} coverWidth={360} style={{ transform: `rotateY(${-32 + i * 4}deg) rotateX(6deg)` }} />
        </div>
      ))}
      <TiltBook book={front} thickness={30} coverWidth={600} />
    </div>
  );
}

const TICKER = [
  { icon: Download, text: "Instant PDF download" },
  { icon: CreditCard, text: "Card, transfer or USSD" },
  { icon: Mail, text: "Delivered to your inbox" },
  { icon: Smartphone, text: "Read on any device" },
  { icon: ShieldCheck, text: "Secured by Nomba" },
];

export function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="relative overflow-hidden border-y border-black/5 bg-white py-4 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <div className="animate-marquee flex w-max gap-10">
        {[...items, ...items].map(({ icon: Icon, text }, i) => (
          <span key={i} className="flex items-center gap-2.5 whitespace-nowrap text-sm font-semibold text-heading-deep/80">
            <Icon className="size-4 text-brand" /> {text}
            <span className="ml-8 text-brand/30">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Price({ book, size = "lg" }: { book: Book; size?: "lg" | "md" }) {
  return (
    <span className="flex flex-wrap items-baseline gap-2">
      <span className={`font-black text-heading-deep ${size === "lg" ? "text-4xl" : "text-2xl"}`}>{formatNaira(book.priceNaira)}</span>
      {book.compareAtNaira && <span className="text-sm text-gray-400 line-through">{formatNaira(book.compareAtNaira)}</span>}
    </span>
  );
}

/** Single-book layout: a wide feature card instead of a lonely grid tile. */
export function Spotlight({ book }: { book: Book }) {
  return (
    <Reveal>
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fff] via-[#fbf5f8] to-[#f3e6ee] p-6 shadow-[0_40px_80px_-40px_rgba(91,42,74,0.45)] ring-1 ring-black/5 sm:p-10 lg:p-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-magenta/10 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="mx-auto w-[60%] max-w-[300px] py-6 sm:w-[45%] lg:w-full">
            <TiltBook book={book} thickness={28} intro={false} coverWidth={600} />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-heading-deep px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
              <Sparkles className="size-3.5 text-academy-discount" /> Featured
            </span>
            <h3 className="mt-5 text-3xl font-black leading-tight text-heading-deep sm:text-5xl">{book.title}</h3>
            {book.author && <p className="mt-2 text-base font-semibold text-brand">by {book.author}</p>}
            {book.subtitle && <p className="mt-4 max-w-xl text-lg leading-relaxed text-gray-600">{book.subtitle}</p>}
            {book.highlights.length > 0 && (
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {book.highlights.slice(0, 4).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" /> {h}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Price book={book} />
              <Link
                href={`/books/${book.slug}`}
                className="group inline-flex items-center gap-2 rounded-full bg-heading-deep px-7 py-4 font-bold text-white shadow-lg shadow-heading-deep/25 transition hover:-translate-y-0.5 hover:bg-[#8e427d]"
              >
                View book <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function BookGrid({ books }: { books: Book[] }) {
  return (
    <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" gap={0.1}>
      {books.map((book) => (
        <StaggerItem key={book.id}>
          <Link
            href={`/books/${book.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-black/5 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-30px_rgba(91,42,74,0.5)]"
          >
            <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f7eef3] to-[#efe1ea] px-10 pb-10 pt-12">
              <div className="absolute -bottom-16 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full bg-heading-deep/15 blur-2xl transition duration-500 group-hover:bg-heading-deep/25" />
              <div className="book3d-scene w-[56%]">
                <Book3D
                  book={book}
                  thickness={22}
                  coverWidth={360}
                  className="transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] [transform:rotateY(-30deg)_rotateX(6deg)] group-hover:[transform:rotateY(-12deg)_rotateX(2deg)_translateY(-10px)]"
                />
              </div>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-xl font-bold text-heading-deep">{book.title}</h3>
              {book.author && <p className="mt-1 text-sm text-gray-500">by {book.author}</p>}
              {book.subtitle && <p className="mt-3 line-clamp-2 text-sm text-gray-600">{book.subtitle}</p>}
              <div className="mt-auto flex items-center justify-between pt-6">
                <Price book={book} size="md" />
                <span className="flex size-11 items-center justify-center rounded-full bg-heading-deep text-white transition group-hover:bg-academy-discount group-hover:text-academy-discount-fg">
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}

const STEPS = [
  { icon: BookOpen, title: "Pick a book", text: "Browse the collection and open any book to see what's inside." },
  { icon: CreditCard, title: "Pay with Nomba", text: "Card, bank transfer or USSD — in Naira, on a secure checkout." },
  { icon: Mail, title: "Read in minutes", text: "Download instantly, and get the link in your inbox to keep." },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">How it works</p>
        <h2 className="mt-3 text-3xl font-black text-heading-deep sm:text-5xl">From checkout to chapter one in minutes</h2>
      </Reveal>
      <div className="relative mt-16">
        <DrawLine className="absolute left-[16.6%] right-[16.6%] top-8 hidden md:block" />
        <Stagger className="relative grid gap-10 md:grid-cols-3" gap={0.18}>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <StaggerItem key={title} className="text-center">
              <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-heading-deep text-white shadow-xl shadow-heading-deep/30">
                <Icon className="size-7" />
                <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-academy-discount text-xs font-black text-academy-discount-fg ring-4 ring-[color:var(--surface)]">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-heading-deep">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-base text-gray-600">{text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
