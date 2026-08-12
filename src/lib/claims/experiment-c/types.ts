import type { EvidencePacket, PerspectiveClaim } from "@/types/perspective-claim";
import type { RetrievalEvaluationMode, RetrievalMode } from "@/types/embedding";

export type PerspectiveExperimentId = "A" | "B" | "C";

export type ExperimentComparisonHumanVerdict =
  | "c-better"
  | "same"
  | "b-better"
  | "unclear";

export type ExperimentComparisonReason =
  | "better-evidence"
  | "better-modern-connection"
  | "better-writer-distinctiveness"
  | "better-returned-question"
  | "better-source-diversity"
  | "more-surprising"
  | "less-relevant"
  | "too-associative"
  | "more-generic"
  | "distinctiveness-loss"
  | "theme-collapse"
  | "historical-overreach"
  | "other";

export interface ClaimReviewIdentity {
  claimTextHash: string;
  evidencePacketHash: string;
  evidenceIds: string[];
  personId: string;
  questionHash: string;
}

export interface ExperimentClaimPool {
  experimentId: "B" | "C";
  retrievalMode: RetrievalMode | "neural-hybrid";
  personId: string;
  question: string;
  deterministicClaims: PerspectiveClaim[];
  llmHumanApprovedClaims: PerspectiveClaim[];
  evidencePacketHash: string;
  packet: EvidencePacket;
}

export interface PerspectiveSetSummary {
  experimentId: PerspectiveExperimentId;
  retrievalMode: string;
  claimIds: string[];
  claimTexts: string[];
  claimOrigins: Array<"deterministic" | "llm">;
  sourceIds: string[];
  themes: string[];
  returnedQuestions: string[];
  internalDiversityScore: number;
  dominantTheme?: string;
  dominantThemeRatio: number;
  redundancyCount: number;
  availability: string;
}

export interface PerspectiveExperimentComparison {
  fixtureId: string;
  personId: string;
  experimentB: PerspectiveSetSummary;
  experimentC: PerspectiveSetSummary;
  retrievalEvidenceChanged: boolean;
  addedSources: string[];
  removedSources: string[];
  unchangedSources: string[];
  addedClaims: string[];
  removedClaims: string[];
  equivalentClaims: string[];
  changedThemes: string[];
  distinctivenessDelta: number;
  internalDiversityDelta: number;
  humanVerdict?: ExperimentComparisonHumanVerdict;
  humanReasons?: ExperimentComparisonReason[];
  notes?: string;
}

export interface BCThreeWriterComparison {
  id?: string;
  fixtureId: string;
  verdict: ExperimentComparisonHumanVerdict;
  distinctiveness: "improved" | "same" | "worse";
  overallUsefulness: "improved" | "same" | "worse";
  notes?: string;
  createdAt?: string;
}

export interface RetrievalRouter {
  chooseMode(analysis: {
    rawQuestion: string;
    relevantThemes: string[];
  }): RetrievalMode | RetrievalEvaluationMode;
}

export interface TemporalSemanticDistance {
  score: number;
  modernConcepts: string[];
  archiveVocabularyGap: number;
  recommendedRetrievalMode: "deterministic" | "neural-hybrid";
}

export const DISTINCTIVENESS_REGRESSION_DELTA = 0.15;
