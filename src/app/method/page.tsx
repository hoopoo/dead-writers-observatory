import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Method",
  description:
    "出典・作品内の声・歴史的距離・人による確認を、Public Beta の背後でどう保つか。",
};

export default function MethodPage() {
  return (
    <article className="public-page">
      <p className="eyebrow">Method</p>
      <h1>どう組み立てているか</h1>
      <p className="public-page__lede">
        流暢さが権威にならないように。Archive が境界を作り、Claim が意味を決め、文章化は表面だけを整えます。
      </p>

      <section>
        <h2>Provenance</h2>
        <p>
          表示される視点は、参照した資料へ辿れます。本人の記述、本人に近い記述、作品内の声は、同じものとして扱いません。
        </p>
      </section>

      <section>
        <h2>Work voice</h2>
        <p>
          作品の中の声を、作家本人の信念へ引き上げません。「太宰はそう考えていた」と書く代わりに、資料の距離を残します。
        </p>
      </section>

      <section>
        <h2>Historical distance</h2>
        <p>
          当時の文章を、いまの制度や技術の専門家意見として扱いません。現在への接続がある場合は、その接続だと明示します。
        </p>
      </section>

      <section>
        <h2>Human curation</h2>
        <p>
          LLM が提案しても、最終的な Claim は資料と人の確認を通ります。未確認の意味は、公開面に出しません。
        </p>
      </section>

      <section>
        <h2>Claim validation</h2>
        <p>
          文章化しても、文は Approved Claims の範囲内に収まる必要があります。新しい助言、新しい史実、新しい問い返しはブロックします。Archive が支えられないときは、沈黙します。
        </p>
      </section>

      <p>
        <Link href="/about">About</Link>
        {" · "}
        <Link href="/">Home</Link>
      </p>
    </article>
  );
}
