import type { ProvenanceLabel } from "./provenance";

export interface HistoricalDistanceAnalysis {
  timelessHumanThemes: string[];
  historicallySpecificUnknowns: string[];
  transferRisks: string[];
  presentDayFactsRequired: string[];
  interpretationBeginsNote: string;
  provenanceMap: {
    timelessHumanThemes: ProvenanceLabel;
    historicallySpecificUnknowns: ProvenanceLabel;
    transferRisks: ProvenanceLabel;
    presentDayFactsRequired: ProvenanceLabel;
    interpretationBeginsNote: ProvenanceLabel;
  };
}
