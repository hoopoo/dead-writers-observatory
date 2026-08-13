import type {
  AuthorialAttribution,
  ClaimSupportStatus,
  ClaimType,
  EvidenceBoundedPerspectiveSkeleton,
  PerspectiveClaim,
} from "@/types/perspective-claim";
import type { HistoricalDistanceAnalysis } from "@/types/historical-distance";
import type { ReviewActor } from "@/types/review";

export type ProseSectionType =
  | "archive"
  | "across-sources"
  | "connection"
  | "returned-question";

export interface ProseInputProvenance {
  claimId: string;
  evidenceIds: string[];
  sourceIds: string[];
  claimType: ClaimType;
  supportStatus: ClaimSupportStatus;
  authorialAttribution: AuthorialAttribution;
  interpretationDistance: "low" | "medium" | "high";
  historicalTransfer: "none" | "limited" | "explicit";
}

export interface EvidenceBoundedProseInput {
  personId: string;
  question: string;
  experimentId: "B";
  skeleton: EvidenceBoundedPerspectiveSkeleton;
  approvedClaims: PerspectiveClaim[];
  historicalDistance: HistoricalDistanceAnalysis;
  provenance: ProseInputProvenance[];
  inputHash: string;
}

export interface ProseSentence {
  id: string;
  text: string;
  claimIds: string[];
  transformationType:
    | "verbatim-claim"
    | "light-edit"
    | "claim-merge"
    | "transition";
  introducesNewMeaning: boolean;
}

export interface ProseSection {
  type: ProseSectionType;
  sentences: ProseSentence[];
}

export interface ProseSentenceMapping {
  sentenceId: string;
  claimIds: string[];
  relation: "direct-restatement" | "merged-restatement" | "transition-only";
  support: "supported" | "partially-supported" | "unsupported" | "unclear";
}

export interface ProseEditorMetadata {
  provider: string;
  model: string;
  promptVersion: string;
  temperature?: number;
  repaired?: boolean;
}

export interface EvidenceBoundedProseOutput {
  personId: string;
  sections: ProseSection[];
  sentenceMappings: ProseSentenceMapping[];
  editorMetadata: ProseEditorMetadata;
}

export type ProseValidationIssue =
  | "missing-claim-mapping"
  | "new-meaning-added"
  | "unsupported-synthesis"
  | "authorial-strengthened"
  | "work-voice-misattribution"
  | "modern-transfer-hidden"
  | "historical-distance-lost"
  | "new-returned-question"
  | "new-advice"
  | "outside-knowledge"
  | "certainty-increased"
  | "claim-omitted"
  | "duplicate-meaning";

export interface ProseSentenceValidation {
  sentenceId: string;
  claimIds: string[];
  support: "supported" | "partially-supported" | "unsupported" | "unclear";
  issues: ProseValidationIssue[];
  allowed: boolean;
}

export interface ProseValidationResult {
  outputId: string;
  sentenceResults: ProseSentenceValidation[];
  totalSentences: number;
  supportedSentences: number;
  partialSentences: number;
  unsupportedSentences: number;
  claimCoverageRate: number;
  semanticPreservationRate: number;
  attributionViolations: number;
  historicalTransferViolations: number;
  workVoiceViolations: number;
  newMeaningViolations: number;
  allowed: boolean;
}

export interface ProseGenerationRecord {
  id: string;
  fixtureId?: string;
  personId: string;
  experimentId: "B";
  inputHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  output: EvidenceBoundedProseOutput;
  validation: ProseValidationResult;
  createdAt: string;
}

export interface ProseHumanEvaluation {
  id: string;
  proseId: string;
  fixtureId: string;
  personId: string;
  fidelity: "preserved" | "minor-drift" | "major-drift" | "unclear";
  readability: "better" | "same" | "worse" | "unclear";
  usefulness: "better" | "same" | "worse" | "unclear";
  distinctiveness: "preserved" | "weakened" | "lost" | "unclear";
  notes?: string;
  reviewer: ReviewActor;
  createdAt: string;
}

export interface CrossWriterProseDistinctiveness {
  fixtureId: string;
  skeletonDistinctiveness: number;
  proseDistinctiveness: number;
  delta: number;
  convergenceRisk: "low" | "medium" | "high";
  returnedQuestionOverlap: number;
  issues: string[];
}

export interface ProseLLMProvider {
  edit(input: EvidenceBoundedProseInput): Promise<EvidenceBoundedProseOutput>;
  providerName: string;
  modelName: string;
  isConfigured(): boolean;
}

export const PROSE_PROMPT_VERSION = "v1";
