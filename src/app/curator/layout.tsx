import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isCuratorEnabled } from "@/lib/curator-env";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Curator Console — Dead Writers Observatory",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const dynamic = "force-dynamic";

export default function CuratorLayout({ children }: { children: ReactNode }) {
  if (!isCuratorEnabled()) {
    notFound();
  }

  return (
    <div className="curator-shell">
      <header className="curator-header">
        <div>
          <p className="eyebrow">DEAD WRITERS OBSERVATORY</p>
          <h1 className="curator-header__title">CURATOR CONSOLE</h1>
          <p className="curator-header__lede">Archive before intelligence.</p>
          <p className="curator-header__sub">
            死者の言葉を、AIの解釈より先に確認する。
            <br />
            Verify the source. Measure the distance. Then interpret.
            <br />
            Relevance × Provenance × Review Integrity × Source Diversity ×
            Authorial Distance
          </p>
        </div>
        <nav className="curator-nav">
          <Link href="/curator">Overview</Link>
          <Link href="/curator/retrieval">Retrieval</Link>
          <Link href="/curator/claims">Claims</Link>
          <Link href="/">Observatory</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
