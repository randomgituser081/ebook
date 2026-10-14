import Image from "next/image";
import Link from "next/link";
import { CreditCard, Landmark, Mail, Smartphone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#160810] text-white/70">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/branding/company_logo.png" alt="Maekandex" width={150} height={40} className="h-8 w-auto brightness-0 invert" />
              <span className="border-l border-white/25 pl-3 text-sm font-bold uppercase tracking-[0.25em] text-white">Bookstore</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed">
              Ebooks from Maekandex Communications Limited — paid securely in Naira and delivered straight to your inbox.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Pay with</p>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm">
              {[
                { icon: CreditCard, label: "Card" },
                { icon: Landmark, label: "Bank transfer" },
                { icon: Smartphone, label: "USSD" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  <Icon className="size-4 text-academy-discount" /> {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/40">Payments processed by Nomba.</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Need help?</p>
            <a
              href="https://maekandex.com/contact-us"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-academy-discount"
            >
              <Mail className="size-4" /> Contact Maekandex
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Maekandex Communications Limited</span>
          <a href="https://maekandex.com" className="hover:text-white">maekandex.com</a>
        </div>
      </div>
    </footer>
  );
}
