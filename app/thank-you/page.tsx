"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Clock, Download, Mail } from "lucide-react";
import { BookLoader } from "@/component/BookLoader";
import { SuccessBurst } from "@/component/SuccessBurst";

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
  // Development only: /thank-you?preview=paid|pending|checking|invalid shows that state.
  const preview = process.env.NODE_ENV !== "production" ? (searchParams.get("preview") as Status | null) : null;
  const [status, setStatus] = useState<Status>(preview ?? (ref ? "checking" : "invalid"));
  const [downloadUrl, setDownloadUrl] = useState(preview ? "#" : "");
  const [emailedTo, setEmailedTo] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState(preview ? "Test Book" : "");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (preview || !ref || status !== "checking") return;

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
            try {
              localStorage.removeItem("mkx-bookstore-last-ref");
              localStorage.removeItem("mkx-bookstore-last-at");
            } catch {}
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
  }, [preview, ref, status, attempt]);

  const retry = () => {
    setStatus("checking");
    setAttempt(0);
  };

  return (
    <div className="rise relative w-full max-w-lg rounded-[2rem] bg-white p-7 text-center shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] sm:p-10" style={{ ["--rise-y" as string]: "30px" }}>
      {status === "paid" && (
        <>
          <SuccessBurst />
          <h1 className="mt-6 text-3xl font-black text-heading-deep">Payment confirmed!</h1>
          <p className="mt-3 text-base text-gray-600">
            Thank you for buying {bookTitle ? <span className="font-semibold">{bookTitle}</span> : "your book"}. Your
            copy is ready.
          </p>
          <a
            href={downloadUrl}
            className="group mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-heading-deep text-base font-bold text-white shadow-lg shadow-heading-deep/30 transition hover:-translate-y-0.5 hover:bg-[#8e427d]"
          >
            <Download className="size-5 transition-transform group-hover:translate-y-0.5" /> Download your ebook (PDF)
          </a>
          {emailedTo && (
            <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-glass-soft p-3.5 text-left text-sm text-gray-700">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>We&apos;ve also emailed your download link to <span className="font-semibold">{emailedTo}</span>. Check
              your spam folder if you don&apos;t see it.</span>
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
          <BookLoader label="Checking with Nomba" className="text-heading-deep" />
          <h1 className="mt-6 text-2xl font-black text-heading-deep">Confirming your payment</h1>
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
            If you completed payment, there&apos;s nothing else you need to do: we keep checking, and your download
            link will be emailed to you as soon as the payment is confirmed. You can also check again below, or contact
            us with your reference: <span className="font-mono text-sm">{ref}</span>
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={retry}
              className="h-12 rounded-2xl bg-heading-deep font-bold text-white transition hover:bg-[#8e427d]"
            >
              Check again
            </button>
            <Link href="/my-books" className="text-sm font-semibold text-brand hover:underline">
              Already paid before? Get your link by email
            </Link>
            <Link href="/" className="text-sm font-semibold text-gray-500 hover:underline">
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
            href="/my-books"
            className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-heading-deep font-bold text-white"
          >
            Get my download link by email
          </Link>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            Back to the bookstore
          </Link>
        </>
      )}
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <div className="grain relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#1c0b16] px-4 py-16">
      <div className="animate-orb-a absolute -left-32 top-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-brand-magenta/30 blur-[110px]" />
      <div className="animate-orb-b absolute -right-24 bottom-0 -z-10 h-[26rem] w-[26rem] rounded-full bg-academy-discount/20 blur-[110px]" />
      <Suspense fallback={null}>
        <ThankYouContent />
      </Suspense>
    </div>
  );
}
