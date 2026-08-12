import type { ThoughtFragment } from "@/types/thought-fragment";
import type { ThoughtFragmentReview } from "@/types/review";
import type { AuthorialDistance } from "@/types/thought-fragment";

export function SourceInterpretationDiff({
  sourceText,
  fragment,
  fragmentReview,
  distance,
}: {
  sourceText?: string;
  fragment?: ThoughtFragment;
  fragmentReview?: ThoughtFragmentReview;
  distance: AuthorialDistance;
}) {
  return (
    <section className="diff-grid">
      <article className="diff-panel">
        <p className="eyebrow">SOURCE PASSAGE</p>
        {sourceText ? (
          <p className="diff-panel__text">{sourceText}</p>
        ) : (
          <p className="diff-panel__empty">NO VERIFIED TEXT</p>
        )}
      </article>
      <article className="diff-panel">
        <p className="eyebrow">ARCHIVE INTERPRETATION</p>
        <p className="diff-panel__text">
          {fragment?.normalizedMeaning ?? "（fragment 未接続）"}
        </p>
        <dl className="diff-meta">
          <div>
            <dt>SUPPORT</dt>
            <dd>
              {(
                fragmentReview?.meaningSupportedByPassage ?? "unclear"
              ).toUpperCase()}
            </dd>
          </div>
          <div>
            <dt>OVERCLAIM RISK</dt>
            <dd>{(fragmentReview?.overclaimRisk ?? "low").toUpperCase()}</dd>
          </div>
          <div>
            <dt>AUTHORIAL DISTANCE</dt>
            <dd>{distance.toUpperCase()}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
