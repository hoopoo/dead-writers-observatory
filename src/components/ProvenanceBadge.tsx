import type { ProvenanceLabel } from "@/types/provenance";
import { provenanceClassName } from "@/lib/provenance";

export function ProvenanceBadge({ label }: { label: ProvenanceLabel }) {
  return (
    <span className={`provenance-badge ${provenanceClassName(label)}`}>
      {label}
    </span>
  );
}
