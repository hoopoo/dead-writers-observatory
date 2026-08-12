import type { ThreeVoicesAnalysis } from "@/types/comparison";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function DisagreementPanel({
  comparison,
}: {
  comparison: ThreeVoicesAnalysis;
}) {
  return (
    <section className="panel">
      <div className="panel__title-row">
        <h2>Where they disagree</h2>
        <ProvenanceBadge label={comparison.provenanceMap.differentFocuses} />
      </div>
      <p className="panel__lede">三人の違い。見る場所が分岐する。</p>
      <ul className="focus-list">
        {comparison.differentFocuses.map((item) => (
          <li key={item.personName}>
            <strong>{item.personName}</strong>
            <span>{item.focus}</span>
          </li>
        ))}
      </ul>
      <ul className="panel__list panel__list--secondary">
        {comparison.tensionsBetweenVoices.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
