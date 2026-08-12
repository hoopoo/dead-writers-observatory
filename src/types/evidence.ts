import type { AuthorialDistance } from "./thought-fragment";
import type { VoiceType, VerificationStatus } from "./source-passage";
import type { ProvenanceLabel } from "./provenance";
import type { SourceType } from "./source";
import type { ReviewStatus } from "./review";

export type EvidenceRole =
  | "author-statement"
  | "work-perspective"
  | "context";

export interface PerspectiveEvidence {
  fragmentId: string;
  sourceId: string;
  passageId: string;
  sourceTitle: string;
  sourceType: SourceType;
  voiceType: VoiceType;
  authorialDistance: AuthorialDistance;
  evidenceRole: EvidenceRole;
  locatorLabel: string;
  verificationStatus: VerificationStatus;
  reviewStatus: ReviewStatus | "none";
  isApprovedEvidence: boolean;
  isDirectAuthorEvidence: boolean;
  sourceText?: string;
  contextBefore?: string;
  contextAfter?: string;
  normalizedMeaning: string;
  bibliographicReference: string;
  provenance: ProvenanceLabel;
  distanceLabelJa: string;
  voiceLabelJa: string;
  roleLabelJa: string;
  relationshipLabelJa: string;
}

export interface ArchivalDistanceSummary {
  directCount: number;
  nearCount: number;
  indirectCount: number;
  unknownCount: number;
  verifiedCount: number;
  approvedCount: number;
  workVoiceCount: number;
  summaryText: string;
}
