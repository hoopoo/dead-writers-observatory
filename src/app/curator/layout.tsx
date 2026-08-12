import Link from "next/link";
import { assertCuratorAccess } from "@/lib/curator";
import type { ReactNode } from "react";

export default function CuratorLayout({ children }: { children: ReactNode }) {
  assertCuratorAccess();

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
          </p>
        </div>
        <nav className="curator-nav">
          <Link href="/curator">Overview</Link>
          <Link href="/curator/retrieval">Retrieval</Link>
          <Link href="/">Observatory</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
