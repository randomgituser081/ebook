"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/** Share a book: the phone's own share sheet when available, plus WhatsApp and copy-link. */
export function ShareBook({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${title} — available on Maekandex Bookstore`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        return; // dismissed
      }
    }
    copy();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const chip =
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white";

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
      <button type="button" onClick={share} className={chip}>
        <Share2 className="size-4 text-academy-discount" /> Share
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`}
        target="_blank"
        rel="noreferrer"
        className={chip}
      >
        <svg viewBox="0 0 24 24" className="size-4 fill-[#25D366]" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z" />
        </svg>
        WhatsApp
      </a>
      <button type="button" onClick={copy} className={chip} aria-live="polite">
        {copied ? <Check className="size-4 text-emerald-400" /> : <Link2 className="size-4 text-academy-discount" />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
