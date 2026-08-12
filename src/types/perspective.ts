import type { PrimaryLens } from "./person";
import type {
  ArchivalDistanceSummary,
  PerspectiveEvidence,
} from "./evidence";
import type { ProvenanceLabel } from "./provenance";
import type { ThoughtFragment } from "./thought-fragment";

/** @deprecated Prefer PerspectiveEvidence; kept for transitional UI. */
export interface SourceFragmentView {
  fragment: ThoughtFragment;
  sourceTitle: string;
  sourceType: string;
  bibliographicReference: string;
  copyrightStatus: string;
  provenance: ProvenanceLabel;
}

export interface WriterPerspective {
  personId: string;
  personName: string;
  personNameEn: string;
  primaryLens: PrimaryLens;
  whereHeLooks: string;
  archiveBasedPerspective: string;
  sourceFragments: SourceFragmentView[];
  evidence: PerspectiveEvidence[];
  archivalDistance: ArchivalDistanceSummary;
  interpretation: string;
  provenanceMap: {
    perspective: ProvenanceLabel;
    interpretation: ProvenanceLabel;
  };
}
