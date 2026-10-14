import Image from "next/image";
import Link from "next/link";

// Sits over a dark hero, so the logo is inverted to white.
export function StoreHeader({ cta }: { cta?: { href: string; label: string } }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="Maekandex Bookstore home" className="flex items-center gap-3">
          <Image
            src="/branding/company_logo.png"
            alt="Maekandex"
            width={150}
            height={40}
            className="h-9 w-auto brightness-0 invert"
            priority
          />
          <span className="hidden border-l border-white/30 pl-3 text-sm font-bold tracking-wide text-white sm:block">
            Bookstore
          </span>
        </Link>
        {cta && (
          <a
            href={cta.href}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-heading-deep transition hover:bg-glass-soft"
          >
            {cta.label}
          </a>
        )}
      </div>
    </header>
  );
}

export function StoreFooter() {
  return (
    <footer className="border-t border-black/5 py-8 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} Maekandex Communications Limited ·{" "}
      <a href="https://maekandex.com/contact-us" className="hover:text-brand">
        Contact us
      </a>
    </footer>
  );
}
