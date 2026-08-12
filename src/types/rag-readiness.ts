import type { ArchiveHealth } from "@/types/archive-health";

export interface RagReadiness {
  personId: string;
  personName: string;
  archiveHealth: ArchiveHealth;
  verifiedRatio: number;
  approvedRatio: number;
  unresolvedHighRisk: number;
  sourceDiversity: number;
  readyForRag: boolean;
  reasons: string[];
}

export type GlobalRagStatus =
  | "READY"
  | "READY WITH KNOWN MINOR DEBT"
  | "NOT READY";

export interface GlobalRagReadiness {
  status: GlobalRagStatus;
  people: RagReadiness[];
  reasons: string[];
  placeholderCount: number;
  unresolvedReviews: number;
  highOverclaimRisk: number;
}
