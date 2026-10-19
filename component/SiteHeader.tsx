"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Transparent over the dark hero; turns into frosted glass once you scroll. */
export function SiteHeader({ cta }: { cta?: { href: string; label: string } }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="rise fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5" style={{ ["--rise-y" as string]: "-16px" }}>
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500 sm:px-5 ${
          scrolled
            ? "border border-white/10 bg-[#2a1222]/75 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl"
            : "border border-transparent bg-transparent"
        }`}
      >
        <Link href="/" aria-label="Maekandex Bookstore home" className="group flex items-center gap-3">
          <Image
            src="/branding/company_logo.png"
            alt="Maekandex"
            width={150}
            height={40}
            priority
            className="h-7 w-auto brightness-0 invert transition-opacity group-hover:opacity-80 sm:h-8"
          />
          <span className="border-l border-white/25 pl-3 text-xs font-bold uppercase tracking-[0.25em] text-white/90 sm:text-sm">
            Bookstore
          </span>
        </Link>

        {cta && (
          <a
            href={cta.href}
            className="group hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-heading-deep shadow-lg shadow-black/10 transition hover:bg-academy-discount hover:text-academy-discount-fg sm:inline-flex sm:px-5 sm:py-2.5"
          >
            {cta.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        )}
      </div>
    </header>
  );
}
