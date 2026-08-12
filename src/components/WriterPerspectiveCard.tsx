import type { WriterPerspective } from "@/types/perspective";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { SourceEvidenceCard } from "./SourceEvidenceCard";

export function WriterPerspectiveCard({
  perspective,
}: {
  perspective: WriterPerspective;
}) {
  return (
    <section className="voice-card">
      <header className="voice-card__header">
        <p className="voice-card__ename">{perspective.personNameEn}</p>
        <h3 className="voice-card__name">{perspective.personName}</h3>
        <p className="voice-card__lens">{perspective.primaryLens}</p>
      </header>

      <div className="voice-block">
        <h4>Where he looks</h4>
        <p>{perspective.whereHeLooks}</p>
      </div>

      <div className="voice-block">
        <div className="voice-block__title-row">
          <h4>Archive-based perspective</h4>
          <ProvenanceBadge label={perspective.provenanceMap.perspective} />
        </div>
        <p>{perspective.archiveBasedPerspective}</p>
      </div>

      <div className="voice-block archival-distance">
        <h4>How close is this to the author?</h4>
        <p className="archival-distance__label">Archival distance</p>
        <p>{perspective.archivalDistance.summaryText}</p>
        <ul className="archival-distance__counts">
          <li>DIRECT: {perspective.archivalDistance.directCount}</li>
          <li>NEAR: {perspective.archivalDistance.nearCount}</li>
          <li>INDIRECT: {perspective.archivalDistance.indirectCount}</li>
          <li>VERIFIED: {perspective.archivalDistance.verifiedCount}</li>
          <li>APPROVED: {perspective.archivalDistance.approvedCount}</li>
          <li>WORK VOICE: {perspective.archivalDistance.workVoiceCount}</li>
        </ul>
      </div>

      <div className="voice-block">
        <h4>Source evidence</h4>
        <div className="source-list">
          {perspective.evidence.map((item) => (
            <SourceEvidenceCard key={item.fragmentId} evidence={item} />
          ))}
        </div>
      </div>

      <div className="voice-block">
        <div className="voice-block__title-row">
          <h4>Interpretation</h4>
          <ProvenanceBadge label={perspective.provenanceMap.interpretation} />
        </div>
        <p>{perspective.interpretation}</p>
        <p className="transfer-note">
          SOURCE → INTERPRETATION → MODERN TRANSFER。verified source
          でも、2026年への接続は AI INFERENCE です。
        </p>
      </div>
    </section>
  );
}
