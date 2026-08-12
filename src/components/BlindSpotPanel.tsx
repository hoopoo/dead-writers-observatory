import type { ThreeVoicesAnalysis } from "@/types/comparison";
import { HistoricalDistancePanel } from "./HistoricalDistancePanel";

/** @deprecated Prefer HistoricalDistancePanel; kept as a thin alias. */
export function BlindSpotPanel({
  comparison,
}: {
  comparison: ThreeVoicesAnalysis;
}) {
  return <HistoricalDistancePanel comparison={comparison} />;
}
