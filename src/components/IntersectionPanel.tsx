import type { ThreeVoicesAnalysis } from "@/types/comparison";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function IntersectionPanel({
  comparison,
}: {
  comparison: ThreeVoicesAnalysis;
}) {
  return (
    <section className="panel">
      <div className="panel__title-row">
        <h2>Where they meet</h2>
        <ProvenanceBadge label={comparison.provenanceMap.sharedConcerns} />
      </div>
      <p className="panel__lede">三人の観測が重なる場所。</p>
      <ul className="panel__list">
        {comparison.sharedConcerns.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
