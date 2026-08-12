import type { SourceFragmentView } from "@/types/perspective";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { AUTHORIAL_DISTANCE_LABELS } from "@/lib/archive-distance-labels";

export function SourceFragment({ item }: { item: SourceFragmentView }) {
  const distance = AUTHORIAL_DISTANCE_LABELS[item.fragment.authorialDistance];

  return (
    <article className="source-fragment">
      <header className="source-fragment__header">
        <div>
          <p className="source-fragment__title">{item.sourceTitle}</p>
          <p className="source-fragment__meta">
            {item.sourceType} · {distance.en} · {distance.ja}
          </p>
        </div>
        <ProvenanceBadge label={item.provenance} />
      </header>
      <p className="source-fragment__meaning">{item.fragment.normalizedMeaning}</p>
      <p className="source-fragment__biblio">{item.bibliographicReference}</p>
      {item.fragment.interpretiveNotes ? (
        <p className="source-fragment__notes">{item.fragment.interpretiveNotes}</p>
      ) : null}
    </article>
  );
}
