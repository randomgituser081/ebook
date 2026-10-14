"use client";

import { useState, type FormEvent } from "react";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { formatNaira } from "@/lib/format";

export function BuyForm({ bookId, priceNaira }: { bookId: string; priceNaira: number }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/ebook/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, fullName, email, phone }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.checkoutLink) {
        setError(data?.error ?? "We couldn't start your payment. Please try again.");
        setIsProcessing(false);
        return;
      }

      try {
        localStorage.setItem("mkx-bookstore-last-ref", data.reference);
      } catch {}
      window.location.href = data.checkoutLink;
    } catch {
      setError("Network error. Check your connection and try again.");
      setIsProcessing(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-glass bg-white px-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="buy-name" className="mb-1.5 block text-sm font-semibold text-heading-deep">
          Full name
        </label>
        <input
          id="buy-name"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ada Okafor"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="buy-email" className="mb-1.5 block text-sm font-semibold text-heading-deep">
          Email address <span className="font-normal text-gray-400">(your book is sent here)</span>
        </label>
        <input
          id="buy-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="buy-phone" className="mb-1.5 block text-sm font-semibold text-heading-deep">
          Phone <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          id="buy-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0803 000 0000"
          className={inputClass}
        />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={isProcessing}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0C0C0C] text-white transition hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span className="text-base font-semibold">Redirecting to Nomba…</span>
          </>
        ) : (
          <>
            <Lock className="size-5 text-white/70" />
            <span className="text-base font-bold">Pay {formatNaira(priceNaira)} with Nomba</span>
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </>
        )}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <ShieldCheck className="size-4 text-emerald-500" />
          SSL encrypted
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Lock className="size-4 text-brand" />
          Secured by Nomba
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Zap className="size-4 text-academy-discount" />
          Instant delivery
        </span>
      </div>
    </form>
  );
}
