import type { ProvenanceLabel } from "./provenance";
import type { HistoricalDistanceAnalysis } from "./historical-distance";

export interface FocusDifference {
  personName: string;
  focus: string;
}

export interface ThreeVoicesAnalysis {
  sharedConcerns: string[];
  differentFocuses: FocusDifference[];
  tensionsBetweenVoices: string[];
  /** @deprecated Prefer historicalDistance.historicallySpecificUnknowns */
  blindSpots: string[];
  historicalDistance: HistoricalDistanceAnalysis;
  returnedQuestion: string;
  provenanceMap: {
    sharedConcerns: ProvenanceLabel;
    differentFocuses: ProvenanceLabel;
    tensionsBetweenVoices: ProvenanceLabel;
    blindSpots: ProvenanceLabel;
    returnedQuestion: ProvenanceLabel;
  };
}
