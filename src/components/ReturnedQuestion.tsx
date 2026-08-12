import type { ThreeVoicesAnalysis } from "@/types/comparison";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function ReturnedQuestion({
  comparison,
}: {
  comparison: ThreeVoicesAnalysis;
}) {
  return (
    <section className="returned">
      <div className="panel__title-row">
        <h2>A question returned to you</h2>
        <ProvenanceBadge label={comparison.provenanceMap.returnedQuestion} />
      </div>
      <p className="returned__question">{comparison.returnedQuestion}</p>
    </section>
  );
}
