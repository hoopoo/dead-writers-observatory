import type { ReviewActor } from "@/types/review";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { EvidenceBoundedProseOutput } from "@/types/prose";
import type { ObservationResult } from "@/types/observation";

export type PublicPerspectiveMode = "skeleton" | "prose";

export interface IndependentProseBlindEvaluation {
  id: string;
  fixtureId: string;
  personId: string;
  assignment: BlindAssignment;
  preferred: "a" | "b" | "same" | "unclear";
  meaningDifference: "none" | "minor" | "material" | "unclear";
  attributionSafe: "yes" | "no" | "unclear";
  feelsMoreReadable: "a" | "b" | "same";
  feelsMoreUseful: "a" | "b" | "same";
  notes?: string;
  reviewer: ReviewActor;
  createdAt: string;
}

export interface BlindAssignment {
  a: PublicPerspectiveMode;
  b: PublicPerspectiveMode;
}

export interface ReleaseQACase {
  id: string;
  question: string;
  category: string;
  expectedSafetyLevel?: string;
  result: "pass" | "needs-review" | "fail";
  issues: string[];
  notes?: string;
}

export interface PublicProvenanceSource {
  sourceId: string;
  title: string;
  personName: string;
  voiceLabel: string;
  distanceLabel: string;
  workVoiceWarning?: string;
}

export interface PublicWriterView {
  personId: string;
  personName: string;
  lensJa: string;
  availability: EvidenceBoundedPerspectiveSkeleton["availability"];
  archiveParagraphs: string[];
  connectionParagraphs: string[];
  returnedQuestion?: string;
  usedProse: boolean;
  proseFallback: boolean;
  provenance: PublicProvenanceSource[];
  hasModernTransfer: boolean;
  sourceCount: number;
}

export interface PublicThreeWriterSummary {
  whereTheyLook: Array<{ personId: string; personName: string; text: string }>;
  shared: string[];
  different: Array<{ personId: string; personName: string; text: string }>;
}

export interface PublicObservation {
  question: string;
  mode: PublicPerspectiveMode;
  observation: ObservationResult;
  writers: PublicWriterView[];
  summary: PublicThreeWriterSummary;
  proseErrorFallback: boolean;
  skeleton: EvidenceBoundedPerspectiveSkeleton[];
  proseByPerson: Record<string, EvidenceBoundedProseOutput | undefined>;
}

export interface PublicBetaReadiness {
  archive: "READY" | "PENDING";
  retrieval: "READY" | "PENDING";
  claims: "READY" | "PENDING";
  distinctiveness: "READY" | "PENDING";
  prose: "P1 READY" | "PENDING";
  independentBlindCheck: "PENDING" | "PASS" | "FAIL";
  publicUx: "READY" | "PENDING";
  releaseQa: "PENDING" | "PASS" | "FAIL";
}
