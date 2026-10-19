"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Phone/tablet only: once the hero's buy button scrolls away, a slim bar keeps the
 * price and "Buy" in reach. It gets out of the way when the checkout is on screen.
 */
export function MobileBuyBar({ price, compareAt, title }: { price: string; compareAt?: string; title: string }) {
  const [pastHero, setPastHero] = useState(false);
  const [atCheckout, setAtCheckout] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const target = document.getElementById("buy");
    const io = target
      ? new IntersectionObserver(([entry]) => setAtCheckout(entry.isIntersecting), { rootMargin: "0px 0px -20% 0px" })
      : null;
    if (target && io) io.observe(target);

    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  const show = pastHero && !atCheckout;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
        show ? "translate-y-0" : "pointer-events-none translate-y-[120%]"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#2a1222]/90 p-3 pl-4 shadow-2xl backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/60">{title}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-lg font-black text-white">{price}</span>
            {compareAt && <span className="text-xs text-white/40 line-through">{compareAt}</span>}
          </p>
        </div>
        <a
          href="#buy"
          tabIndex={show ? 0 : -1}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-academy-discount px-5 py-3 text-sm font-bold text-academy-discount-fg active:scale-95"
        >
          Buy now <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
}
