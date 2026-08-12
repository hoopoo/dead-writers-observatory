import type { ThreeVoicesAnalysis } from "@/types/comparison";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function HistoricalDistancePanel({
  comparison,
}: {
  comparison: ThreeVoicesAnalysis;
}) {
  const hd = comparison.historicalDistance;

  return (
    <section className="panel panel--caution historical-distance">
      <div className="panel__title-row">
        <h2>Historical distance</h2>
        <ProvenanceBadge label="AI INFERENCE" />
      </div>
      <p className="panel__lede">
        過去の人物を「未来を予言した人」として扱わない。残された主題と、2026年固有の条件を分けて見る。
      </p>

      <div className="hd-grid">
        <div>
          <h3>What they can help us see</h3>
          <ul className="panel__list">
            {hd.timelessHumanThemes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3>What they could not have known</h3>
          <ul className="panel__list">
            {hd.historicallySpecificUnknowns.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Where interpretation begins</h3>
          <p>{hd.interpretationBeginsNote}</p>
          <p className="hd-subhead">Transfer risks</p>
          <ul className="panel__list panel__list--secondary">
            {hd.transferRisks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="hd-subhead">Present-day facts required</p>
          <ul className="panel__list panel__list--secondary">
            {hd.presentDayFactsRequired.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
