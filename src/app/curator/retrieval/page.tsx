import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { HumanVerdictForm } from "@/components/curator/HumanVerdictForm";
import { compareRetrievalEvaluationModes } from "@/lib/retrieval-compare";
import { indexPassageEmbeddings } from "@/lib/embeddings/index-passages";
import { findMachineHumanDisagreements } from "@/lib/human-eval-disagreement";
import {
  getRetrievalHumanEvaluation,
  listRetrievalHumanEvaluations,
  summarizeHumanEvaluations,
} from "@/lib/retrieval-human-eval";
import type {
  CandidateEvaluationMode,
  RetrievalEvaluationMode,
} from "@/types/embedding";
import type { ModeComparisonResult } from "@/lib/retrieval-compare";

const CANDIDATES: CandidateEvaluationMode[] = [
  "local-semantic",
  "neural-semantic",
  "neural-hybrid",
];

const PRIORITY_FIXTURES = new Set(["q3", "q4", "q5", "q6"]);

function stableFlip(seed: string): boolean {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 1;
}

function EvidenceColumn(props: {
  title: string;
  result: ModeComparisonResult;
  machineLabel?: string;
}) {
  return (
    <article className="mode-compare-card ab-column">
      <h3>{props.title}</h3>
      {props.machineLabel ? (
        <p className="panel__lede">{props.machineLabel}</p>
      ) : null}
      {props.result.error ? (
        <p className="baseline-compare__warn">{props.result.error}</p>
      ) : null}
      {props.result.fallback ? (
        <p className="baseline-compare__warn">
          FALLBACK — {props.result.fallback}
        </p>
      ) : null}
      <ol className="mode-rank-list">
        {props.result.traces.map((trace, index) => (
          <li key={trace.fragmentId}>
            <strong>
              Rank {index + 1} · {trace.sourceTitle}
            </strong>
            <span>
              Voice {trace.voiceType ?? "—"} · Distance{" "}
              {trace.authorialDistance.toUpperCase()} · Score{" "}
              {trace.finalRerankScore.toFixed(2)}
              {trace.semanticSimilarity !== undefined
                ? ` · sim ${trace.semanticSimilarity.toFixed(3)}`
                : ""}
            </span>
            <span>
              Themes: {(trace.themes ?? trace.themeOverlap).join(", ") || "—"}
            </span>
            {trace.passagePreview ? (
              <p className="evidence-preview">{trace.passagePreview}…</p>
            ) : null}
            {trace.normalizedMeaning ? (
              <p className="evidence-meaning">{trace.normalizedMeaning}</p>
            ) : null}
          </li>
        ))}
      </ol>
      <dl className="diff-meta">
        <div>
          <dt>MACHINE QUALITY</dt>
          <dd>{props.result.quality.total}</dd>
        </div>
        <div>
          <dt>SOURCE DIV</dt>
          <dd>{props.result.sourceDiversity}</dd>
        </div>
        <div>
          <dt>DIST DIV</dt>
          <dd>{props.result.distanceDiversity}</dd>
        </div>
        <div>
          <dt>THEME DIV</dt>
          <dd>{props.result.themeDiversity}</dd>
        </div>
      </dl>
    </article>
  );
}

export default async function CuratorRetrievalPage({
  searchParams,
}: {
  searchParams: Promise<{
    fixture?: string;
    person?: string;
    candidate?: string;
    blind?: string;
    disagreements?: string;
  }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const personId = params.person ?? "person-soseki";
  const candidateMode = (
    CANDIDATES.includes(params.candidate as CandidateEvaluationMode)
      ? params.candidate
      : "neural-hybrid"
  ) as CandidateEvaluationMode;
  const blind = params.blind === "1";
  const disagreementsOnly = params.disagreements === "1";

  const fixture =
    FIXTURE_QUESTIONS.find((item) => item.id === fixtureId) ??
    FIXTURE_QUESTIONS[0];
  const person = people.find((p) => p.id === personId) ?? people[0];

  await indexPassageEmbeddings({
    provider: "local-bridge",
    requireNeural: false,
  });

  const modes: RetrievalEvaluationMode[] = [
    "deterministic",
    candidateMode,
  ];
  const comparisons = await compareRetrievalEvaluationModes({
    question: fixture.question,
    personId: person.id,
    modes,
  });
  const baseline =
    comparisons.find((c) => c.mode === "deterministic") ?? comparisons[0];
  const candidate =
    comparisons.find((c) => c.mode === candidateMode) ?? comparisons[1];

  const flipped = blind
    ? stableFlip(`${fixture.id}:${person.id}:${candidateMode}`)
    : false;
  const left = flipped ? candidate : baseline;
  const right = flipped ? baseline : candidate;
  const leftTitle = blind ? "SET A" : "DETERMINISTIC";
  const rightTitle = blind
    ? "SET B"
    : candidateMode.replace("-", " ").toUpperCase();

  const existing = getRetrievalHumanEvaluation({
    fixtureId: fixture.id,
    personId: person.id,
    candidateMode,
  });

  const allEvals = listRetrievalHumanEvaluations();
  const summaries = summarizeHumanEvaluations({
    evaluations: allEvals,
    fixtureIds: FIXTURE_QUESTIONS.map((f) => f.id),
    personIds: people.map((p) => p.id),
  });
  const disagreements = await findMachineHumanDisagreements(allEvals);

  const queryBase = `/curator/retrieval?fixture=${fixture.id}&person=${person.id}&candidate=${candidateMode}`;

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">RETRIEVAL HUMAN EVALUATION</p>
        <h2>Measure retrieval before generating interpretation</h2>
        <p className="panel__lede">
          Machine retrieval quality cannot replace human archival judgment.
          Neural similarity is useful only when it improves the evidence set
          without damaging provenance or diversity.
        </p>

        <div className="retrieval-controls">
          <div>
            <p className="eyebrow">FIXTURE</p>
            <ul className="fixture-tabs">
              {FIXTURE_QUESTIONS.map((item, index) => (
                <li key={item.id}>
                  <Link
                    href={`/curator/retrieval?fixture=${item.id}&person=${person.id}&candidate=${candidateMode}${blind ? "&blind=1" : ""}${disagreementsOnly ? "&disagreements=1" : ""}`}
                    className={item.id === fixture.id ? "is-active" : undefined}
                  >
                    {String(index + 1).padStart(2, "0")}
                    {PRIORITY_FIXTURES.has(item.id) ? "*" : ""}
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
                    href={`/curator/retrieval?fixture=${fixture.id}&person=${item.id}&candidate=${candidateMode}${blind ? "&blind=1" : ""}${disagreementsOnly ? "&disagreements=1" : ""}`}
                    className={item.id === person.id ? "is-active" : undefined}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">CANDIDATE</p>
            <ul className="fixture-tabs">
              {CANDIDATES.map((mode) => (
                <li key={mode}>
                  <Link
                    href={`/curator/retrieval?fixture=${fixture.id}&person=${person.id}&candidate=${mode}${blind ? "&blind=1" : ""}`}
                    className={mode === candidateMode ? "is-active" : undefined}
                  >
                    {mode}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="question-panel__text" style={{ fontSize: "1.35rem" }}>
          {fixture.question}
        </p>
        {PRIORITY_FIXTURES.has(fixture.id) ? (
          <p className="baseline-compare__warn">
            PRIORITY HUMAN REVIEW — AI / SNS / Success-happiness / Aging
          </p>
        ) : null}

        <div className="retrieval-controls" style={{ marginTop: "1rem" }}>
          <Link href={`${queryBase}&blind=${blind ? "0" : "1"}`}>
            {blind ? "Exit blind mode" : "Blind evaluation mode"}
          </Link>
          <Link
            href={`${queryBase}${blind ? "&blind=1" : ""}&disagreements=${disagreementsOnly ? "0" : "1"}`}
          >
            {disagreementsOnly
              ? "Show all matrix"
              : "SHOW DISAGREEMENTS ONLY"}
          </Link>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">
          BASELINE: DETERMINISTIC · CANDIDATE:{" "}
          {candidateMode.replace("-", " ").toUpperCase()}
        </p>
        <div className="mode-compare-grid ab-grid">
          <EvidenceColumn
            title={leftTitle}
            result={left}
            machineLabel={
              blind
                ? undefined
                : `Machine quality ${left.quality.total} (separate from human verdict)`
            }
          />
          <EvidenceColumn
            title={rightTitle}
            result={right}
            machineLabel={
              blind
                ? undefined
                : `Machine quality ${right.quality.total} (separate from human verdict)`
            }
          />
        </div>
      </section>

      <section className="panel">
        <HumanVerdictForm
          fixtureId={fixture.id}
          personId={person.id}
          candidateMode={candidateMode}
          candidatePassageIds={candidate.selected.map((f) => f.passageId)}
          existing={existing}
          blindLeftMode={
            blind
              ? flipped
                ? candidateMode
                : "deterministic"
              : undefined
          }
          blindRightMode={
            blind
              ? flipped
                ? "deterministic"
                : candidateMode
              : undefined
          }
        />
      </section>

      <section className="panel">
        <p className="eyebrow">HUMAN EVALUATION SUMMARY</p>
        <div className="mode-compare-grid">
          {summaries.map((summary) => (
            <article key={summary.mode} className="mode-compare-card">
              <h3>{summary.mode}</h3>
              <dl className="diff-meta">
                <div>
                  <dt>BETTER</dt>
                  <dd>{summary.better}</dd>
                </div>
                <div>
                  <dt>SAME</dt>
                  <dd>{summary.same}</dd>
                </div>
                <div>
                  <dt>WORSE</dt>
                  <dd>{summary.worse}</dd>
                </div>
                <div>
                  <dt>UNCLEAR</dt>
                  <dd>{summary.unclear}</dd>
                </div>
                <div>
                  <dt>NOT REVIEWED</dt>
                  <dd>{summary.notReviewed}</dd>
                </div>
                <div>
                  <dt>BETTER + SAME</dt>
                  <dd>{summary.betterSameRate.toFixed(0)}%</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">MACHINE / HUMAN DISAGREEMENT</p>
        {disagreements.length === 0 ? (
          <p className="panel__lede">No high-machine / WORSE cases recorded.</p>
        ) : (
          <ul className="warning-list">
            {disagreements.map((item) => (
              <li key={item.evaluation.id}>
                Fixture {item.evaluation.fixtureId} ·{" "}
                {item.evaluation.personId} · Machine {item.machineQuality} ·
                Human WORSE · {item.reasonTags.join(", ") || "—"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">30-CASE MATRIX</p>
        <div className="eval-matrix">
          {FIXTURE_QUESTIONS.filter((item) => {
            if (!disagreementsOnly) return true;
            return disagreements.some((d) => d.evaluation.fixtureId === item.id);
          }).map((item, index) => (
            <div key={item.id} className="eval-matrix__fixture">
              <h4>
                FIXTURE {String(index + 1).padStart(2, "0")}
                {PRIORITY_FIXTURES.has(item.id) ? " ★" : ""} — {item.label}
              </h4>
              {people.map((writer) => (
                <p key={writer.id}>
                  <strong>{writer.name}</strong>{" "}
                  {CANDIDATES.map((mode) => {
                    const found = allEvals.find(
                      (e) =>
                        e.fixtureId === item.id &&
                        e.personId === writer.id &&
                        e.candidateMode === mode,
                    );
                    return (
                      <span key={mode} className="matrix-chip">
                        {mode}: {found ? found.verdict.toUpperCase() : "NOT REVIEWED"}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
