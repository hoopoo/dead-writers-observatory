import type { ObservationResult } from "@/types/observation";
import { WriterPerspectiveCard } from "./WriterPerspectiveCard";
import { IntersectionPanel } from "./IntersectionPanel";
import { DisagreementPanel } from "./DisagreementPanel";
import { BlindSpotPanel } from "./BlindSpotPanel";
import { ReturnedQuestion } from "./ReturnedQuestion";
import { ProvenancePanel } from "./ProvenancePanel";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function ObservationResultView({
  result,
}: {
  result: ObservationResult;
}) {
  return (
    <div className="result">
      {result.safetyNotice ? (
        <aside className="safety-notice" role="note">
          {result.safetyNotice}
        </aside>
      ) : null}

      <section className="panel question-panel">
        <p className="eyebrow">Your question</p>
        <h1 className="question-panel__text">
          {result.analysis.surfaceQuestion}
        </h1>
        <div className="question-meta">
          <div>
            <p className="meta-label">Underlying tensions</p>
            <ul>
              {result.analysis.underlyingTensions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="meta-label">
              Possible hidden question <ProvenanceBadge label="AI INFERENCE" />
            </p>
            <p>{result.analysis.possibleHiddenQuestion}</p>
          </div>
        </div>
      </section>

      <section className="voices-section">
        <div className="section-heading">
          <p className="eyebrow">Three voices</p>
          <h2>三人の残した言葉から読む</h2>
        </div>
        <div className="voices-grid">
          {result.perspectives.map((perspective) => (
            <WriterPerspectiveCard
              key={perspective.personId}
              perspective={perspective}
            />
          ))}
        </div>
      </section>

      <IntersectionPanel comparison={result.comparison} />
      <DisagreementPanel comparison={result.comparison} />
      <BlindSpotPanel comparison={result.comparison} />
      <ReturnedQuestion comparison={result.comparison} />
      <ProvenancePanel result={result} />
    </div>
  );
}
