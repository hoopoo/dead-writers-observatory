import Link from "next/link";
import { people } from "@/data/people";
import { PublicWriterCard } from "@/components/public/PublicWriterCard";
import { PublicCompareView } from "@/components/public/PublicCompareView";
import type { PublicObservation } from "@/types/public";

export function PublicResultView(props: {
  result: PublicObservation;
  writerSlug?: string;
  view?: string;
}) {
  const { result, view } = props;
  const q = encodeURIComponent(result.question);
  const compare = view === "compare";
  const active =
    people.find((p) => p.slug === props.writerSlug) ?? people[0];
  const writer =
    result.writers.find((w) => w.personId === active.id) ?? result.writers[0];
  const safety = result.observation.safetyNotice;

  return (
    <div className="public-result">
      {safety ? (
        <aside className="safety-notice" role="note">
          {safety}
        </aside>
      ) : null}

      <header className="public-result__header">
        <p className="eyebrow">あなたの問い</p>
        <h1>「{result.observation.analysis.surfaceQuestion}」</h1>
        <p className="public-result__lede">
          3つの資料群から、この問いを読み直します。
        </p>
      </header>

      <nav className="public-writer-nav" aria-label="資料群">
        {people.map((person, index) => {
          const href = `/observe?q=${q}&writer=${person.slug}`;
          const isActive = !compare && person.id === active.id;
          return (
            <Link
              key={person.id}
              href={href}
              className={
                isActive
                  ? "public-writer-nav__item is-active"
                  : "public-writer-nav__item"
              }
            >
              <span>0{index + 1}</span>
              {person.name}
            </Link>
          );
        })}
        <Link
          href={`/observe?q=${q}&view=compare`}
          className={
            compare
              ? "public-writer-nav__item is-active"
              : "public-writer-nav__item"
          }
        >
          並べて見る
        </Link>
      </nav>

      {result.proseErrorFallback ? (
        <p className="public-result__fallback">
          文章表示を生成できなかったため、資料ベースの表示に切り替えました。
        </p>
      ) : null}

      {compare ? (
        <PublicCompareView result={result} />
      ) : writer ? (
        <PublicWriterCard writer={writer} question={result.question} />
      ) : null}

      <p className="public-result__disclaimer">
        このサイトは、作家本人を再現するものではありません。AIは作家になりきらず、残された資料から、現在の問いに接続可能な視点を構成します。
      </p>

      <div className="result-actions">
        <Link href="/" className="button-secondary">
          別の問いを置く
        </Link>
      </div>
    </div>
  );
}
