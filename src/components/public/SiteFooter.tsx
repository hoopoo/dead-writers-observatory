import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer__en">The dead do not answer.</p>
      <p className="site-footer__en">Their words remain.</p>
      <p className="site-footer__meta">v0.1 Public Beta</p>
      <p className="site-footer__privacy">
        質問はこの体験の生成に使用されます。履歴としては保存していません。
      </p>
      <p className="site-footer__archive">
        Archiveは今後、資料の検証とともに少しずつ拡張されます。
      </p>
      <nav className="site-footer__nav">
        <Link href="/about">About</Link>
        <Link href="/method">Method</Link>
      </nav>
    </footer>
  );
}
