import { ArrowDown, ArrowRight, Download, Mail, ShieldCheck } from "lucide-react";
import { Magnetic, Reveal } from "@/component/motion";
import { Rise, TextReveal } from "@/component/TextReveal";
import { SiteFooter } from "@/component/SiteFooter";
import { SiteHeader } from "@/component/SiteHeader";
import { BookGrid, HeroBooks, HowItWorks, Spotlight, Ticker } from "@/component/store/Sections";
import { listBooks } from "@/lib/books";

export const dynamic = "force-dynamic";

export default async function BookstorePage() {
  const books = await listBooks({ publishedOnly: true });

  return (
    <div className="bg-[color:var(--surface)] text-gray-900">
      <SiteHeader cta={books.length ? { href: "#books", label: "Browse books" } : undefined} />

      {/* ---------- Hero ---------- */}
      <section className="grain relative isolate overflow-hidden bg-[#1c0b16] pb-16 pt-28 sm:pb-20 sm:pt-40 lg:min-h-[92vh] lg:pb-28">
        <div className="animate-orb-a absolute -left-32 top-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-brand-magenta/35 blur-[110px]" />
        <div className="animate-orb-b absolute -right-24 bottom-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-brand/40 blur-[110px]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:gap-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <Rise y={12}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur">
                <span className="size-1.5 animate-pulse rounded-full bg-academy-discount" /> Maekandex Bookstore
              </span>
            </Rise>
            <TextReveal
              text="Ebooks, delivered straight to your inbox."
              className="mt-6 text-[2.6rem] font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
              delay={0.15}
            />
            <Rise delay={0.55} y={16}>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl lg:mx-0">
                Practical books from the Maekandex team. Pay securely in Naira and start reading the moment your payment is
                confirmed.
              </p>
            </Rise>
            <Rise delay={0.7} y={16}>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                <Magnetic>
                  <a
                    href="#books"
                    className="group inline-flex items-center gap-2 rounded-full bg-academy-discount px-8 py-4 text-base font-bold text-academy-discount-fg shadow-[0_15px_40px_-10px_rgba(232,163,61,0.6)] transition hover:bg-white"
                  >
                    Browse books <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Magnetic>
                <a href="#how" className="inline-flex items-center gap-2 px-4 py-3 font-semibold text-white/80 transition hover:text-white">
                  How it works <ArrowDown className="size-4" />
                </a>
              </div>
            </Rise>
            <Rise delay={0.85} y={10}>
              <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-white/60 lg:justify-start">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-academy-discount" /> Secured by Nomba</span>
                <span className="flex items-center gap-2"><Mail className="size-4 text-academy-discount" /> Sent to your email</span>
                <span className="flex items-center gap-2"><Download className="size-4 text-academy-discount" /> Instant PDF</span>
              </div>
            </Rise>
          </div>

          <div className="relative order-1 flex justify-center lg:order-2 lg:justify-end lg:pr-6">
            <HeroBooks books={books} />
          </div>
        </div>
      </section>

      <Ticker />

      {/* ---------- Collection ---------- */}
      <section id="books" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-20 sm:px-6 sm:pt-28">
        <Reveal className="mb-10 flex flex-col gap-3 sm:mb-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand">The collection</p>
            <h2 className="mt-3 text-3xl font-black text-heading-deep sm:text-5xl">
              {books.length === 1 ? "Our first book" : "Available books"}
            </h2>
          </div>
          {books.length > 1 && <p className="text-gray-500">{books.length} titles</p>}
        </Reveal>

        {books.length === 0 ? (
          <Reveal>
            <div className="rounded-[2rem] border border-dashed border-heading-deep/20 bg-white p-12 text-center">
              <p className="text-xl font-bold text-heading-deep">New books are on the way</p>
              <p className="mt-2 text-gray-500">Please check back soon.</p>
            </div>
          </Reveal>
        ) : books.length === 1 ? (
          <Spotlight book={books[0]} />
        ) : (
          <BookGrid books={books} />
        )}
      </section>

      <HowItWorks />

      {/* ---------- Closing CTA ---------- */}
      {books.length > 0 && (
        <section className="px-3 pb-20 sm:px-5">
          <Reveal>
            <div className="grain relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#2a1222] px-6 py-16 text-center sm:px-12 sm:py-20">
              <div className="animate-orb-a absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-magenta/40 blur-3xl" />
              <div className="animate-orb-b absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-academy-discount/25 blur-3xl" />
              <h2 className="relative text-3xl font-black text-white sm:text-5xl">Your next read is one click away</h2>
              <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/70">
                Instant download, a copy in your inbox, and nothing to install.
              </p>
              <div className="relative mt-8 flex justify-center">
                <Magnetic>
                  <a
                    href="#books"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-heading-deep transition hover:bg-academy-discount"
                  >
                    Choose a book <ArrowRight className="size-5" />
                  </a>
                </Magnetic>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
