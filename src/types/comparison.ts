import type { ProvenanceLabel } from "./provenance";

export interface FocusDifference {
  personName: string;
  focus: string;
}

export interface ThreeVoicesAnalysis {
  sharedConcerns: string[];
  differentFocuses: FocusDifference[];
  tensionsBetweenVoices: string[];
  blindSpots: string[];
  returnedQuestion: string;
  provenanceMap: {
    sharedConcerns: ProvenanceLabel;
    differentFocuses: ProvenanceLabel;
    tensionsBetweenVoices: ProvenanceLabel;
    blindSpots: ProvenanceLabel;
    returnedQuestion: ProvenanceLabel;
  };
}
