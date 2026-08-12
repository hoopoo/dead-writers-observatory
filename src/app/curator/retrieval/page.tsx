import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { compareRetrievalModes } from "@/lib/retrieval-compare";
import { indexPassageEmbeddings } from "@/lib/embeddings/index-passages";
import type { RetrievalMode } from "@/types/embedding";

const MODES: RetrievalMode[] = ["deterministic", "semantic", "hybrid"];

export default async function CuratorRetrievalPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; person?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q1";
  const personId = params.person ?? "person-soseki";
  const fixture =
    FIXTURE_QUESTIONS.find((item) => item.id === fixtureId) ??
    FIXTURE_QUESTIONS[0];
  const person = people.find((p) => p.id === personId) ?? people[0];

  await indexPassageEmbeddings();
  const comparisons = await compareRetrievalModes({
    question: fixture.question,
    personId: person.id,
    modes: MODES,
  });

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">RETRIEVAL AUDIT</p>
        <h2>Deterministic vs Semantic vs Hybrid</h2>
        <p className="panel__lede">
          Vector similarity is nomination, not authority.
          Semantic candidates must pass Archive Trust Filter and Evidence
          Diversity Reranker. Retrieval Quality is not truth probability.
        </p>

        <div className="retrieval-controls">
          <div>
            <p className="eyebrow">FIXTURE</p>
            <ul className="fixture-tabs">
              {FIXTURE_QUESTIONS.map((item, index) => (
                <li key={item.id}>
                  <Link
                    href={`/curator/retrieval?fixture=${item.id}&person=${person.id}`}
                    className={item.id === fixture.id ? "is-active" : undefined}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">WRITER</p>
            <ul className="fixture-tabs">
              {people.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/curator/retrieval?fixture=${fixture.id}&person=${item.id}`}
                    className={item.id === person.id ? "is-active" : undefined}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="question-panel__text" style={{ fontSize: "1.35rem" }}>
          {fixture.question}
        </p>
      </section>

      <section className="panel">
        <p className="eyebrow">MODE COMPARISON — {person.name}</p>
        <div className="mode-compare-grid">
          {comparisons.map((result) => (
            <article key={result.mode} className="mode-compare-card">
              <h3>{result.mode.toUpperCase()}</h3>
              {result.fallback ? (
                <p className="baseline-compare__warn">
                  SEMANTIC FALLBACK — {result.fallback}
                </p>
              ) : null}
              {result.funnel ? (
                <p className="funnel">
                  SEMANTIC CANDIDATES {result.funnel.semanticCandidates}
                  {" ↓ "}
                  TRUSTED {result.funnel.trusted}
                  {" ↓ "}
                  DIVERSITY RERANKED {result.funnel.diversityReranked}
                  {" ↓ "}
                  SELECTED {result.funnel.selected}
                </p>
              ) : null}
              <ol className="mode-rank-list">
                {result.traces.map((trace, index) => (
                  <li key={trace.fragmentId}>
                    <strong>
                      {index + 1}. {trace.sourceTitle}
                    </strong>
                    <span>
                      {trace.authorialDistance.toUpperCase()} · trust{" "}
                      {trace.trustStatus}
                    </span>
                    <span>
                      {trace.semanticSimilarity !== undefined
                        ? `similarity ${trace.semanticSimilarity.toFixed(3)} · `
                        : ""}
                      det {trace.deterministicRelevance.toFixed(2)} · themes{" "}
                      {trace.themeOverlap.join(", ") || "—"}
                    </span>
                  </li>
                ))}
              </ol>
              <dl className="diff-meta">
                <div>
                  <dt>QUALITY</dt>
                  <dd>{result.quality.total}</dd>
                </div>
                <div>
                  <dt>SOURCE DIV</dt>
                  <dd>{result.sourceDiversity}</dd>
                </div>
                <div>
                  <dt>DIST DIV</dt>
                  <dd>{result.distanceDiversity}</dd>
                </div>
              </dl>
              {result.warnings.length > 0 ? (
                <ul className="warning-list">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="panel__lede">No structural warnings.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">QUALITY NOTE</p>
        <p>
          Retrieval Quality は「回答が真実である確率」ではありません。
          Evidence set が関連・出典健全・偏り抑制・距離明示できているかを見る
          内部指標です。
        </p>
      </section>
    </div>
  );
}
