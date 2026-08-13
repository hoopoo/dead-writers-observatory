import type { Metadata } from "next";
import Link from "next/link";
import { ConditionalPublicChrome } from "@/components/public/ConditionalPublicChrome";
import { SiteFooter } from "@/components/public/SiteFooter";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DESCRIPTION =
  "漱石、芥川、太宰が残した資料に、現代の問いを通して読み直す実験。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dead Writers Observatory",
    template: "%s · Dead Writers Observatory",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Dead Writers Observatory",
    description: DESCRIPTION,
    locale: "ja_JP",
    type: "website",
    siteName: "Dead Writers Observatory",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <main>
          <header className="site-header">
            <Link href="/" className="brand">
              Dead Writers Observatory
              <span>v0.1.1 Public Beta</span>
            </Link>
            <ConditionalPublicChrome>
              <nav className="site-nav" aria-label="Public">
                <Link href="/about">About</Link>
                <Link href="/method">Method</Link>
              </nav>
            </ConditionalPublicChrome>
          </header>
          {children}
          <ConditionalPublicChrome>
            <SiteFooter />
          </ConditionalPublicChrome>
        </main>
      </body>
    </html>
  );
}
