import type { QuestionAnalysis } from "@/types/question-analysis";
import type { HistoricalDistanceAnalysis } from "@/types/historical-distance";
import type {
  AuthorialDistance,
  InterpretationType,
  ThemeTag,
  ThoughtFragment,
} from "@/types/thought-fragment";
import type { VoiceType, VerificationStatus } from "@/types/source-passage";
import type { ReviewStatus, OverclaimRisk } from "@/types/review";
import type { EvidenceRole } from "@/types/evidence";

export type GenerationMode =
  | "deterministic-claims"
  | "llm-claims"
  | "llm-prose";

export type ClaimSupportStatus =
  | "supported"
  | "partially-supported"
  | "unsupported"
  | "unclear";

export type ClaimType =
  | "archive-observation"
  | "writer-perspective"
  | "cross-evidence-synthesis"
  | "modern-transfer"
  | "returned-question";

export type AuthorialAttribution =
  | "direct-author"
  | "near-author"
  | "work-level"
  | "mixed"
  | "none";

export type ClaimEvidenceRelation =
  | "direct-support"
  | "partial-support"
  | "context"
  | "contrast";

export type ClaimValidationIssue =
  | "missing-evidence"
  | "unsupported-generalization"
  | "authorial-overreach"
  | "work-voice-misattribution"
  | "historical-overreach"
  | "modern-concept-attributed-to-writer"
  | "unsupported-certainty"
  | "insufficient-source-diversity"
  | "contradiction-flattened";

export interface EvidencePacketItem {
  /** Stable id used by claim evidenceIds (usually fragmentId). */
  id: string;
  passageId: string;
  fragmentId: string;
  sourceId: string;
  personId: string;
  sourceTitle: string;
  passageText?: string;
  normalizedMeaning: string;
  themes: ThemeTag[];
  voiceType: VoiceType;
  authorialDistance: AuthorialDistance;
  interpretationType: ThoughtFragment["interpretationType"];
  verificationStatus: VerificationStatus;
  reviewStatus: ReviewStatus;
  supportStatus: ClaimSupportStatus;
  overclaimRisk: OverclaimRisk;
  evidenceRole: EvidenceRole;
  retrievalTrace?: {
    similarity?: number;
    deterministicScore?: number;
    rerankScore?: number;
  };
}

export interface EvidenceTension {
  evidenceIds: string[];
  description: string;
}

export interface EvidencePacket {
  id: string;
  question: QuestionAnalysis;
  personId: string;
  retrievalMode: string;
  evidence: EvidencePacketItem[];
  historicalDistance: HistoricalDistanceAnalysis;
  tensions: EvidenceTension[];
  rejectedCandidates: Array<{
    fragmentId: string;
    passageId: string;
    reasons: string[];
  }>;
  createdAt: string;
}

export interface ClaimEvidenceLink {
  claimId: string;
  evidenceId: string;
  relation: ClaimEvidenceRelation;
}

export interface PerspectiveClaim {
  id: string;
  personId: string;
  claimType: ClaimType;
  text: string;
  evidenceIds: string[];
  supportStatus: ClaimSupportStatus;
  authorialAttribution: AuthorialAttribution;
  interpretationDistance: "low" | "medium" | "high";
  historicalTransfer: "none" | "limited" | "explicit";
  confidence: "high" | "medium" | "low";
  allowedInFinalPerspective: boolean;
  validationIssues: ClaimValidationIssue[];
  links?: ClaimEvidenceLink[];
}

export interface ClaimValidationResult {
  claimId: string;
  supportStatus: ClaimSupportStatus;
  allowed: boolean;
  issues: ClaimValidationIssue[];
  evidenceCoverage: number;
  attributionRisk: "low" | "medium" | "high";
  historicalTransferRisk: "low" | "medium" | "high";
}

export interface PerspectiveClaimGenerator {
  generate(packet: EvidencePacket): Promise<PerspectiveClaim[]>;
}

/** Future LLM claim generator — interface only (not wired). */
export type LLMClaimGenerator = PerspectiveClaimGenerator;

export interface ClaimValidator {
  validate(
    claim: PerspectiveClaim,
    packet: EvidencePacket,
  ): ClaimValidationResult;
}

export interface ClaimQualitySummary {
  totalClaims: number;
  supported: number;
  partiallySupported: number;
  unsupported: number;
  unclear: number;
  allowed: number;
  blocked: number;
  attributionRiskCount: number;
  historicalRiskCount: number;
  workVoiceViolationCount: number;
}

export interface ClaimHumanEvaluation {
  id: string;
  claimId: string;
  fixtureId: string;
  personId: string;
  evidenceVerdict:
    | "supported"
    | "too-strong"
    | "too-weak"
    | "misattributed"
    | "unclear";
  usefulnessVerdict:
    | "useful"
    | "obvious"
    | "not-useful"
    | "surprising-but-defensible"
    | "unclear";
  strengthVerdict:
    | "appropriate"
    | "too-cautious"
    | "too-certain"
    | "unclear";
  reasonTags?: ClaimHumanReasonTag[];
  notes?: string;
  reviewer: import("@/types/review").ReviewActor;
  createdAt: string;
  updatedAt?: string;
}

export type ClaimHumanReasonTag =
  | "well-grounded"
  | "evidence-too-thin"
  | "authorial-overreach"
  | "work-voice-risk"
  | "historical-overreach"
  | "modern-transfer-clear"
  | "too-generic"
  | "too-obvious"
  | "opens-new-angle"
  | "useful-tension"
  | "good-cross-source-synthesis"
  | "weak-cross-source-synthesis"
  | "too-cautious"
  | "too-certain"
  | "repetitive"
  | "historically-interesting"
  | "other";

export interface ClaimHumanEvaluationInput {
  claimId: string;
  fixtureId: string;
  personId: string;
  evidenceVerdict: ClaimHumanEvaluation["evidenceVerdict"];
  usefulnessVerdict: ClaimHumanEvaluation["usefulnessVerdict"];
  strengthVerdict: ClaimHumanEvaluation["strengthVerdict"];
  reasonTags?: ClaimHumanReasonTag[];
  notes?: string;
}

export interface PerspectiveExperienceEvaluation {
  fixtureId: string;
  personId: string;
  verdict:
    | "useful"
    | "interesting"
    | "flat"
    | "repetitive"
    | "too-cautious"
    | "too-abstract"
    | "unclear";
  notes?: string;
}

export type PerspectiveAvailability =
  | "available"
  | "limited"
  | "insufficient";

export interface ApprovedClaimSet {
  personId: string;
  archiveObservations: PerspectiveClaim[];
  writerPerspectives: PerspectiveClaim[];
  syntheses: PerspectiveClaim[];
  modernTransfers: PerspectiveClaim[];
  returnedQuestions: PerspectiveClaim[];
}

export interface EvidenceBoundedPerspectiveSkeleton {
  personId: string;
  personName: string;
  question: string;
  availability: PerspectiveAvailability;
  sections: {
    archiveObservation: string[];
    acrossSources: string[];
    connectionToQuestion: string[];
    returnedQuestion: string[];
  };
  claimIds: string[];
  evidenceIds: string[];
  claims: PerspectiveClaim[];
  humanReviewed: boolean;
}

export interface ClaimCaseResult {
  fixtureId: string;
  personId: string;
  packet: EvidencePacket;
  claims: PerspectiveClaim[];
  validations: ClaimValidationResult[];
  quality: ClaimQualitySummary;
}

export interface ClaimSnapshotBundle {
  version: string;
  generatedAt: string;
  generationMode: GenerationMode;
  cases: Array<{
    fixtureId: string;
    personId: string;
    claimIds: string[];
    claimTexts: string[];
    claimTypes: ClaimType[];
    supportStatuses: ClaimSupportStatus[];
    allowedFlags: boolean[];
    validationIssues: ClaimValidationIssue[][];
  }>;
}

export type { InterpretationType };
