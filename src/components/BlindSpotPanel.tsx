import type { ThreeVoicesAnalysis } from "@/types/comparison";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function BlindSpotPanel({
  comparison,
}: {
  comparison: ThreeVoicesAnalysis;
}) {
  return (
    <section className="panel panel--caution">
      <div className="panel__title-row">
        <h2>What none of them can know</h2>
        <ProvenanceBadge label={comparison.provenanceMap.blindSpots} />
      </div>
      <p className="panel__lede">
        三人は現代の人物ではない。過去の思想を現代の事実判断へ乱用しない。
      </p>
      <ul className="panel__list">
        {comparison.blindSpots.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
