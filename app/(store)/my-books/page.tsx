import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecoverForm } from "@/component/RecoverForm";
import { SiteFooter } from "@/component/SiteFooter";
import { SiteHeader } from "@/component/SiteHeader";
import { MAX_RESENDS } from "@/lib/ebookOrders";

export const metadata: Metadata = {
  title: "Find my purchase",
  description: "Lost your download email? Get a new link to the books you bought.",
};

export default function MyBooksPage() {
  return (
    <div className="bg-[color:var(--surface)]">
      <SiteHeader />

      <main className="grain relative isolate flex min-h-[92vh] items-center justify-center overflow-hidden bg-[#1c0b16] px-4 pb-20 pt-32">
        <div className="animate-orb-a absolute -left-32 top-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-brand-magenta/30 blur-[110px]" />
        <div className="animate-orb-b absolute -right-24 bottom-0 -z-10 h-[26rem] w-[26rem] rounded-full bg-brand/30 blur-[110px]" />

        <div className="rise w-full max-w-md" style={{ ["--rise-y" as string]: "24px" }}>
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white">
            <ArrowLeft className="size-4" /> All books
          </Link>
          <div className="rounded-[2rem] bg-white p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)] sm:p-9">
            <h1 className="text-3xl font-black text-heading-deep">Find your purchase</h1>
            <p className="mb-6 mt-2 text-base text-gray-600">
              Lost the email, or coming back another day? Enter the email you paid with and we&apos;ll send you a fresh
              download link.
            </p>
            <RecoverForm maxResends={MAX_RESENDS} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
