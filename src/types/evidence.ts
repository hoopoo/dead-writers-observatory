import type { AuthorialDistance } from "./thought-fragment";
import type { VoiceType, VerificationStatus } from "./source-passage";
import type { ProvenanceLabel } from "./provenance";
import type { SourceType } from "./source";

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
  normalizedMeaning: string;
  bibliographicReference: string;
  provenance: ProvenanceLabel;
  distanceLabelJa: string;
  voiceLabelJa: string;
  roleLabelJa: string;
}

export interface ArchivalDistanceSummary {
  directCount: number;
  nearCount: number;
  indirectCount: number;
  unknownCount: number;
  summaryText: string;
}
