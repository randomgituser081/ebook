"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Download, AlertCircle } from "lucide-react";

type Status = "checking" | "paid" | "pending" | "invalid";

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 45; // ~3 minutes — bank transfers can take a moment to settle

function readStoredRef(): string | null {
  try {
    return localStorage.getItem("mkx-bookstore-last-ref");
  } catch {
    return null;
  }
}

function ThankYouContent() {
  const searchParams = useSearchParams();
  const [ref] = useState<string | null>(
    () => searchParams.get("ref") ?? searchParams.get("orderReference") ?? readStoredRef(),
  );
  const [status, setStatus] = useState<Status>(ref ? "checking" : "invalid");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [emailedTo, setEmailedTo] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ref || status !== "checking") return;

    let cancelled = false;
    const timer = setTimeout(
      async () => {
        try {
          const res = await fetch(`/api/ebook/verify?ref=${encodeURIComponent(ref)}`, { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (cancelled) return;
          if (data?.status === "paid" && data.downloadUrl) {
            setDownloadUrl(data.downloadUrl);
            setEmailedTo(data.emailedTo ?? null);
            setBookTitle(data.bookTitle ?? "");
            setStatus("paid");
            return;
          }
          if (data?.status === "invalid") {
            setStatus("invalid");
            return;
          }
        } catch {}
        if (cancelled) return;
        if (attempt + 1 >= MAX_ATTEMPTS) setStatus("pending");
        else setAttempt(attempt + 1);
      },
      attempt === 0 ? 0 : POLL_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ref, status, attempt]);

  const retry = () => {
    setStatus("checking");
    setAttempt(0);
  };

  return (
    <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-10">
      {status === "paid" && (
        <>
          <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
          <h1 className="mt-5 text-3xl font-black text-heading-deep">Payment confirmed!</h1>
          <p className="mt-3 text-base text-gray-600">
            Thank you for buying {bookTitle ? <span className="font-semibold">{bookTitle}</span> : "your book"}. Your
            copy is ready.
          </p>
          <a
            href={downloadUrl}
            className="mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#995982] text-base font-bold text-white transition hover:bg-[#8e427d]"
          >
            <Download className="size-5" /> Download your ebook (PDF)
          </a>
          {emailedTo && (
            <p className="mt-5 rounded-xl bg-glass-soft p-3 text-sm text-gray-700">
              We&apos;ve also emailed your download link to <span className="font-semibold">{emailedTo}</span>. Check
              your spam folder if you don&apos;t see it.
            </p>
          )}
          <p className="mt-4 text-xs text-gray-500">
            Your link works for 7 days. Reference: <span className="font-mono">{ref}</span>
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">
            Browse more books
          </Link>
        </>
      )}

      {status === "checking" && (
        <>
          <span className="mx-auto block h-14 w-14 animate-spin rounded-full border-4 border-glass border-t-brand" />
          <h1 className="mt-6 text-2xl font-black text-heading-deep">Confirming your payment…</h1>
          <p className="mt-3 text-base text-gray-600">
            This usually takes a few seconds. Bank transfers can take a minute or two — please keep this page open.
          </p>
        </>
      )}

      {status === "pending" && (
        <>
          <Clock className="mx-auto size-14 text-academy-discount" />
          <h1 className="mt-5 text-2xl font-black text-heading-deep">We haven&apos;t received your payment yet</h1>
          <p className="mt-3 text-base text-gray-600">
            If you completed payment, it may still be processing. Check again in a moment, or contact us with your
            reference: <span className="font-mono text-sm">{ref}</span>
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={retry}
              className="h-12 rounded-2xl bg-[#995982] font-bold text-white transition hover:bg-[#8e427d]"
            >
              Check again
            </button>
            <Link href="/" className="text-sm font-semibold text-brand hover:underline">
              Didn&apos;t pay? Back to the bookstore
            </Link>
          </div>
        </>
      )}

      {status === "invalid" && (
        <>
          <AlertCircle className="mx-auto size-14 text-red-500" />
          <h1 className="mt-5 text-2xl font-black text-heading-deep">We couldn&apos;t find your order</h1>
          <p className="mt-3 text-base text-gray-600">
            This link is missing a valid payment reference. If you&apos;ve been charged, contact us and we&apos;ll help.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#995982] font-bold text-white"
          >
            Back to the bookstore
          </Link>
        </>
      )}
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-plum-deep px-4 py-16">
      <Suspense fallback={null}>
        <ThankYouContent />
      </Suspense>
    </div>
  );
}
