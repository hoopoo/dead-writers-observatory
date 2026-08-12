import type { HistoricalDistanceAnalysis } from "@/types/historical-distance";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type {
  AuthorialAttribution,
  ClaimType,
  EvidencePacket,
  PerspectiveClaim,
} from "@/types/perspective-claim";

export const LLM_CLAIM_PROMPT_VERSION = "v1";

export const LLM_CLAIM_ALLOWED_TYPES = [
  "cross-evidence-synthesis",
  "modern-transfer",
  "returned-question",
  "evidence-tension",
] as const;

export type LLMClaimProposalType = (typeof LLM_CLAIM_ALLOWED_TYPES)[number];

export interface LLMProposedClaim {
  temporaryId: string;
  claimType: LLMClaimProposalType;
  text: string;
  evidenceIds: string[];
  proposedSupport: "supported" | "partially-supported";
  proposedAuthorialAttribution: AuthorialAttribution;
  proposedInterpretationDistance: "low" | "medium" | "high";
  proposedHistoricalTransfer: "none" | "limited" | "explicit";
  rationale: string;
}

export interface LLMClaimProposalInput {
  question: string;
  questionAnalysis: QuestionAnalysis;
  personId: string;
  personName: string;
  evidencePacket: EvidencePacket;
  historicalDistance: HistoricalDistanceAnalysis;
  promptVersion: string;
  maxProposals: number;
}

export interface LLMClaimProposalUsage {
  inputTokens?: number;
  outputTokens?: number;
  calls: number;
}

export interface LLMClaimProposalOutput {
  proposals: LLMProposedClaim[];
  usage: LLMClaimProposalUsage;
  rawStructuredOutput?: unknown;
  temperature?: number;
}

export interface ClaimLLMProvider {
  readonly providerName: string;
  readonly modelName: string;
  isConfigured(): boolean;
  generateStructuredClaims(
    input: LLMClaimProposalInput,
  ): Promise<LLMClaimProposalOutput>;
}

export type ClaimExperimentStatus =
  | "proposal"
  | "validated"
  | "human-approved"
  | "rejected";

export type ClaimNovelty =
  | "duplicate"
  | "similar"
  | "new-angle"
  | "unclear";

export interface ClaimNoveltyAssessment {
  claimId: string;
  comparedAgainstClaimIds: string[];
  novelty: ClaimNovelty;
  notes?: string;
}

export interface LLMClaimProposalRecord {
  id: string;
  fixtureId: string;
  personId: string;
  evidencePacketHash: string;
  provider: string;
  model: string;
  promptVersion: string;
  temperature?: number;
  rawStructuredOutput?: unknown;
  usage?: LLMClaimProposalUsage;
  createdAt: string;
}

export interface ValidatedLLMClaim {
  claim: PerspectiveClaim;
  proposal: LLMProposedClaim;
  experimentStatus: ClaimExperimentStatus;
  novelty?: ClaimNoveltyAssessment;
  schemaValid: boolean;
  schemaIssues: string[];
}

export interface LLMClaimExperimentCase {
  fixtureId: string;
  personId: string;
  packet: EvidencePacket;
  packetHash: string;
  deterministicClaims: PerspectiveClaim[];
  llmClaims: ValidatedLLMClaim[];
  record?: LLMClaimProposalRecord;
  providerUnavailable?: boolean;
}

/** Map LLM proposal type onto PerspectiveClaim.claimType. */
export function toPerspectiveClaimType(
  type: LLMClaimProposalType,
): ClaimType {
  if (type === "evidence-tension") return "cross-evidence-synthesis";
  return type;
}
