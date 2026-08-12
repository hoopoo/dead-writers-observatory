import type { PerspectiveEvidence } from "@/types/evidence";
import { AUTHORIAL_DISTANCE_LABELS } from "@/lib/archive-distance";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function SourceEvidenceCard({ evidence }: { evidence: PerspectiveEvidence }) {
  const distance = AUTHORIAL_DISTANCE_LABELS[evidence.authorialDistance];

  return (
    <article className="evidence-card">
      <header className="evidence-card__header">
        <div>
          <p className="evidence-card__title">『{evidence.sourceTitle}』</p>
          <p className="evidence-card__meta">{evidence.sourceType}</p>
        </div>
        <ProvenanceBadge label={evidence.provenance} />
      </header>

      <dl className="evidence-dl">
        <div>
          <dt>Voice</dt>
          <dd>{evidence.voiceLabelJa}</dd>
        </div>
        <div>
          <dt>Authorial distance</dt>
          <dd>
            <span className={`distance-pill distance-${evidence.authorialDistance}`}>
              {distance.en}
            </span>
            <span className="distance-ja">{distance.ja}</span>
          </dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{evidence.roleLabelJa}</dd>
        </div>
        <div>
          <dt>Locator</dt>
          <dd>{evidence.locatorLabel}</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>{evidence.verificationStatus.toUpperCase()}</dd>
        </div>
      </dl>

      <p className="evidence-card__meaning">{evidence.normalizedMeaning}</p>
      <p className="evidence-card__biblio">{evidence.bibliographicReference}</p>
    </article>
  );
}
