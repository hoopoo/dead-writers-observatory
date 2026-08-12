import type { WriterPerspective } from "@/types/perspective";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { SourceFragment } from "./SourceFragment";

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

      <div className="voice-block">
        <h4>Source fragments</h4>
        <div className="source-list">
          {perspective.sourceFragments.map((item) => (
            <SourceFragment key={item.fragment.id} item={item} />
          ))}
        </div>
      </div>

      <div className="voice-block">
        <div className="voice-block__title-row">
          <h4>Interpretation</h4>
          <ProvenanceBadge label={perspective.provenanceMap.interpretation} />
        </div>
        <p>{perspective.interpretation}</p>
      </div>
    </section>
  );
}
