import Link from "next/link";
import { QuestionForm } from "@/components/QuestionForm";

export default function HomePage() {
  return (
    <>
      <section className="hero public-home-hero">
        <p className="eyebrow">v0.1.1 Public Beta</p>
        <h1 className="hero__principle hero__principle--lead">
          死者は答えない。
          <br />
          言葉が残っている。
        </h1>
        <p className="hero__support">
          漱石、芥川、太宰が残した資料に、
          <br />
          あなたの問いを通してみる。
        </p>
        <p className="hero__explain">
          作家本人を再現するものではありません。
          AIが作家になりきって答えるサービスではありません。
          残された文章を読み直し、現在の問いに接続できる視点を探す実験です。
        </p>
      </section>

      <QuestionForm />

      <section className="public-home-section">
        <p className="eyebrow">Three Writers</p>
        <h2>現在のArchive</h2>
        <ul className="public-home-writers">
          <li>
            <strong>夏目漱石</strong>
            <span>社会と自己</span>
          </li>
          <li>
            <strong>芥川龍之介</strong>
            <span>不安と自己観察</span>
          </li>
          <li>
            <strong>太宰治</strong>
            <span>羞恥と他者</span>
          </li>
        </ul>
        <p className="public-home-note">
          現在のArchiveは、漱石・芥川・太宰の検証済み資料の一部から構成されています。
        </p>
      </section>

      <section className="public-home-section">
        <p className="eyebrow">How this works</p>
        <h2>問いを、資料に通す</h2>
        <ol className="public-home-steps">
          <li>いまの問いを置く</li>
          <li>3つのArchiveから資料を選ぶ</li>
          <li>確認された視点だけを読む</li>
          <li>必要なら、なぜそう読めるかを見る</li>
        </ol>
      </section>

      <section className="public-home-section">
        <p className="eyebrow">What this is not</p>
        <h2>これは会話ではありません</h2>
        <ul className="public-home-not">
          <li>死者AIとの会話ではありません</li>
          <li>作家の人格再現ではありません</li>
          <li>現代の専門家による助言でもありません</li>
        </ul>
      </section>

      <section className="public-home-section">
        <p className="eyebrow">Archive</p>
        <h2>残された言葉から</h2>
        <p>
          いまを生きる人の問いを、亡くなった作家が残した資料に通してみる。
          出典は、いつでも一段下で確認できます。
        </p>
        <p>
          <Link href="/about">About</Link>
          {" · "}
          <Link href="/method">Method</Link>
        </p>
      </section>
    </>
  );
}
