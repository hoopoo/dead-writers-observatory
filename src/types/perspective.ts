import type { PrimaryLens } from "./person";
import type { ThoughtFragment } from "./thought-fragment";
import type { ProvenanceLabel } from "./provenance";

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
  interpretation: string;
  provenanceMap: {
    perspective: ProvenanceLabel;
    interpretation: ProvenanceLabel;
  };
}
