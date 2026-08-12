import type { ObservationResult } from "@/types/observation";
import {
  collectProvenanceItems,
  getProvenanceDefinitions,
} from "@/lib/provenance";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function ProvenancePanel({ result }: { result: ObservationResult }) {
  const definitions = getProvenanceDefinitions();
  const items = collectProvenanceItems(result);

  return (
    <section className="panel provenance-panel">
      <h2>Sources & provenance</h2>
      <p className="panel__lede">
        すべての出力は DIRECT SOURCE / INTERPRETATION / AI INFERENCE
        に分類されます。色だけに依存せず、ラベルでも区別します。
      </p>

      <div className="provenance-defs">
        {definitions.map((def) => (
          <div key={def.label} className="provenance-def">
            <ProvenanceBadge label={def.label} />
            <p>{def.definition}</p>
          </div>
        ))}
      </div>

      <ul className="provenance-items">
        {items.map((item) => (
          <li key={`${item.section}-${item.label}-${item.detail.slice(0, 24)}`}>
            <div className="provenance-items__head">
              <span>{item.section}</span>
              <ProvenanceBadge label={item.label} />
            </div>
            <p>{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
