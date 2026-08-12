export type ArchiveReadiness =
  | "placeholder"
  | "curating"
  | "usable"
  | "strong";

export interface ArchiveHealth {
  personId: string;
  personName: string;
  verifiedPassages: number;
  approvedPassages: number;
  directEvidenceCount: number;
  nearEvidenceCount: number;
  indirectEvidenceCount: number;
  sourceDiversity: number;
  unresolvedReviews: number;
  highRiskInterpretations: number;
  readiness: ArchiveReadiness;
}
