import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";

import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#A14F5B",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Maekandex Bookstore",
    template: "%s | Maekandex Bookstore",
  },
  description: "Buy ebooks securely in Naira and get them delivered to your inbox.",
  openGraph: {
    title: "Maekandex Bookstore",
    description: "Buy ebooks securely in Naira and get them delivered to your inbox.",
    siteName: "Maekandex Communications Limited",
    locale: "en_NG",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <body className={`${lato.className} min-h-screen bg-white text-gray-900 selection:bg-[#A14F5B] selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
