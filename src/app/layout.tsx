import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dead Writers Observatory",
  description:
    "死者は答えない。言葉が残っている。漱石・芥川・太宰の残した言葉から、いまの問いを読み直す Observatory。",
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
              <span>SHIRO & Co. Observatory</span>
            </Link>
            <p className="nav-note">Archive-based Perspective Engine</p>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
