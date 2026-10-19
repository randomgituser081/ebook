"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grain relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1c0b16] px-6 text-center text-white">
      <div className="animate-orb-a absolute -left-32 top-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-brand-magenta/30 blur-[110px]" />
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-academy-discount">Something went wrong</p>
      <h1 className="mt-3 text-4xl font-black sm:text-5xl">We couldn&apos;t load this page</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-white/70">
        It&apos;s usually a brief connection hiccup. Please try again. If you were paying, your payment is safe.
      </p>
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-academy-discount px-7 py-3.5 font-bold text-academy-discount-fg transition hover:bg-white"
        >
          <RotateCcw className="size-4" /> Try again
        </button>
        <Link href="/" className="px-4 py-3 font-semibold text-white/75 transition hover:text-white">
          Back to the bookstore
        </Link>
      </div>
    </main>
  );
}
