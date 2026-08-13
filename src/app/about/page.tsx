import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Dead Writers Observatory は、残された資料と現代の問いを接続する Archive-based Perspective Engine です。",
};

export default function AboutPage() {
  return (
    <article className="public-page">
      <p className="eyebrow">About</p>
      <h1>Dead Writers Observatory</h1>
      <p className="public-page__lede">
        いまを生きる人の問いを、亡くなった作家が残した資料に通してみる。
      </p>

      <section>
        <h2>What this is</h2>
        <p>
          残された資料と現代の問いを接続する、Archive-based Perspective
          Engine です。死者は答えません。言葉が残っているだけです。
        </p>
      </section>

      <section>
        <h2>What this is not</h2>
        <p>作家本人を再現するものではありません。</p>
        <p>AIが作家になりきって答えるサービスではありません。</p>
        <ul>
          <li>dead writer chatbot</li>
          <li>降霊やセッション</li>
          <li>personality simulation</li>
          <li>現代の専門家による助言（医療・法律・投資を含む）</li>
        </ul>
      </section>

      <section>
        <h2>How it works</h2>
        <ol className="public-home-steps">
          <li>Question</li>
          <li>Archive Retrieval</li>
          <li>Evidence Review</li>
          <li>Approved Claims</li>
          <li>Meaning-Preserving Prose</li>
        </ol>
      </section>

      <section>
        <h2>現在のArchive</h2>
        <ul>
          <li>夏目漱石</li>
          <li>芥川龍之介</li>
          <li>太宰治</li>
        </ul>
        <p>
          現在のArchiveは、漱石・芥川・太宰の検証済み資料の一部から構成されています。すべての著作を網羅しているわけではありません。Archiveは今後、資料の検証とともに少しずつ拡張されます。
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>質問はこの体験の生成に使用されます。履歴としては保存していません。</p>
      </section>

      <p>
        <Link href="/method">Method</Link>
        {" · "}
        <Link href="/">Home</Link>
      </p>
    </article>
  );
}
