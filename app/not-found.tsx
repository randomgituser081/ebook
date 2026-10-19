import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookLoader } from "@/component/BookLoader";

export default function NotFound() {
  return (
    <main className="grain relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1c0b16] px-6 text-center text-white">
      <div className="animate-orb-a absolute -left-32 top-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-brand-magenta/30 blur-[110px]" />
      <div className="animate-orb-b absolute -right-24 bottom-0 -z-10 h-[26rem] w-[26rem] rounded-full bg-brand/30 blur-[110px]" />
      <Link href="/" className="absolute left-5 top-5 flex items-center gap-3 sm:left-8 sm:top-7">
        <Image src="/branding/company_logo.png" alt="Maekandex" width={150} height={40} className="h-7 w-auto brightness-0 invert" />
        <span className="border-l border-white/25 pl-3 text-xs font-bold uppercase tracking-[0.25em]">Bookstore</span>
      </Link>

      <BookLoader label="Turning every page" className="text-white" />
      <p className="mt-10 text-sm font-bold uppercase tracking-[0.3em] text-academy-discount">Error 404</p>
      <h1 className="mt-3 text-4xl font-black sm:text-6xl">This page isn&apos;t in our library</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-white/70">
        It may have moved, or the book is no longer available.
      </p>
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-academy-discount px-7 py-3.5 font-bold text-academy-discount-fg transition hover:bg-white"
        >
          Browse books <ArrowRight className="size-4" />
        </Link>
        <Link href="/my-books" className="px-4 py-3 font-semibold text-white/75 transition hover:text-white">
          Find my purchase
        </Link>
      </div>
    </main>
  );
}
