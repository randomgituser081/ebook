"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Mail } from "lucide-react";

export function RecoverForm({ maxResends }: { maxResends: number }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/ebook/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Network error. Check your connection and try again.");
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
        <h2 className="mt-4 text-2xl font-black text-heading-deep">Check your inbox</h2>
        <p className="mt-3 text-base text-gray-600">
          If <span className="font-semibold text-gray-800">{email}</span> has a purchase, a new download link is on its
          way. It can take a minute, and it may land in your spam folder.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setEmail("");
          }}
          className="mt-6 text-sm font-semibold text-brand hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="recover-email" className="mb-1.5 block text-sm font-semibold text-heading-deep">
          Email you paid with
        </label>
        <input
          id="recover-email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-13 w-full rounded-xl border border-glass bg-[color:var(--surface)] px-4 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-heading-deep font-bold text-white shadow-lg shadow-heading-deep/25 transition hover:-translate-y-0.5 hover:bg-[#8e427d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? (
          <>
            <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Sending…
          </>
        ) : (
          <>
            <Mail className="size-5" /> Email me my download link
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-500">
        For your security the link is only ever sent to that inbox. You can ask for a new link up to {maxResends} times per
        purchase.
      </p>
    </form>
  );
}
