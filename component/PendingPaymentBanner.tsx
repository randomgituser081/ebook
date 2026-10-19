"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

export const LAST_REF_KEY = "mkx-bookstore-last-ref";
export const LAST_AT_KEY = "mkx-bookstore-last-at";
const SHOW_FOR_MS = 6 * 60 * 60_000;

function readPending(): string | null {
  try {
    const ref = localStorage.getItem(LAST_REF_KEY);
    const at = Number(localStorage.getItem(LAST_AT_KEY));
    if (!ref || !at || Date.now() - at > SHOW_FOR_MS) return null;
    return ref;
  } catch {
    return null;
  }
}

/**
 * If the buyer left to pay on Nomba and comes back to the shop by any route (the back
 * button, a bookmark, typing the address), remind them to confirm their payment. Nomba
 * doesn't always send people back on its own.
 */
export function PendingPaymentBanner() {
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setRef(readPending());
    refresh();
    // The back button can restore the page from memory without re-running anything.
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  if (!ref) return null;

  const dismiss = () => {
    try {
      localStorage.removeItem(LAST_REF_KEY);
      localStorage.removeItem(LAST_AT_KEY);
    } catch {}
    setRef(null);
  };

  return (
    <div className="fixed inset-x-0 top-[4.5rem] z-40 flex justify-center px-3 sm:top-20">
      <div className="flex max-w-md items-center gap-2 rounded-2xl bg-academy-discount py-2 pl-4 pr-2 text-sm font-semibold text-academy-discount-fg shadow-xl shadow-black/20">
        <span className="min-w-0 flex-1">Finished paying on Nomba?</span>
        <Link
          href={`/thank-you?ref=${encodeURIComponent(ref)}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#2a1222] px-3.5 py-2 text-white transition hover:bg-[#3b1d30]"
        >
          Check my payment <ArrowRight className="size-4" />
        </Link>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded-full p-1.5 hover:bg-black/10">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
