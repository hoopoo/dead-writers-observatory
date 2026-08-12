import { stableClaimId } from "@/lib/claims/deterministic-generator";
import {
  toPerspectiveClaimType,
  type LLMProposedClaim,
  type ValidatedLLMClaim,
} from "@/lib/claims/llm/types";
import type {
  AuthorialAttribution,
  EvidencePacket,
  PerspectiveClaim,
} from "@/types/perspective-claim";

const ALLOWED_TYPES = new Set([
  "cross-evidence-synthesis",
  "modern-transfer",
  "returned-question",
  "evidence-tension",
]);

const ALLOWED_ATTRIBUTION = new Set<AuthorialAttribution>([
  "direct-author",
  "near-author",
  "work-level",
  "mixed",
  "none",
]);

function evidenceExists(packet: EvidencePacket, id: string): boolean {
  return packet.evidence.some((e) => e.id === id || e.fragmentId === id);
}

/**
 * Schema-level checks before PerspectiveClaim conversion.
 * Does not replace ClaimValidator.
 */
export function validateProposalSchema(
  proposal: LLMProposedClaim,
  packet: EvidencePacket,
): string[] {
  const issues: string[] = [];
  if (!proposal || typeof proposal !== "object") {
    return ["proposal-schema-invalid"];
  }
  if (!proposal.temporaryId?.trim()) issues.push("proposal-schema-invalid");
  if (!ALLOWED_TYPES.has(proposal.claimType)) {
    issues.push("proposal-schema-invalid");
  }
  if (!proposal.text?.trim()) issues.push("proposal-schema-invalid");
  if (!Array.isArray(proposal.evidenceIds) || proposal.evidenceIds.length === 0) {
    issues.push("proposal-schema-invalid");
  }
  if (!ALLOWED_ATTRIBUTION.has(proposal.proposedAuthorialAttribution)) {
    issues.push("proposal-schema-invalid");
  }
  for (const id of proposal.evidenceIds ?? []) {
    if (!evidenceExists(packet, id)) {
      issues.push("evidence-id-invalid");
    }
  }
  // Invented quotation marks with long quoted spans — soft signal only
  if (/「[^」]{40,}」/.test(proposal.text ?? "")) {
    issues.push("external-knowledge-injection");
  }
  return Array.from(new Set(issues));
}

export function proposalToPerspectiveClaim(args: {
  proposal: LLMProposedClaim;
  packet: EvidencePacket;
  providerName: string;
  modelName: string;
  promptVersion: string;
}): PerspectiveClaim {
  const { proposal, packet, providerName, modelName, promptVersion } = args;
  const claimType = toPerspectiveClaimType(proposal.claimType);
  let authorialAttribution = proposal.proposedAuthorialAttribution;
  let historicalTransfer = proposal.proposedHistoricalTransfer;

  if (claimType === "modern-transfer") {
    authorialAttribution = "none";
    historicalTransfer = "explicit";
  }
  if (claimType === "returned-question") {
    authorialAttribution = "none";
  }

  const relation =
    proposal.claimType === "evidence-tension" ? "contrast" : "partial-support";

  const id = stableClaimId([
    "llm",
    packet.personId,
    packet.question.rawQuestion,
    claimType,
    proposal.temporaryId,
    proposal.text,
    proposal.evidenceIds.join(","),
    promptVersion,
  ]);

  return {
    id,
    personId: packet.personId,
    claimType,
    text: proposal.text.trim(),
    evidenceIds: proposal.evidenceIds,
    supportStatus: "unclear",
    authorialAttribution,
    interpretationDistance: proposal.proposedInterpretationDistance,
    historicalTransfer,
    confidence: "medium",
    allowedInFinalPerspective: false,
    validationIssues: [],
    generatorOrigin: "llm",
    generatorProvider: providerName,
    generatorModel: modelName,
    promptVersion,
    experimentStatus: "proposal",
    links: proposal.evidenceIds.map((evidenceId) => ({
      claimId: id,
      evidenceId,
      relation:
        claimType === "returned-question"
          ? "context"
          : relation,
    })),
  };
}

export function buildValidatedLLMClaim(args: {
  proposal: LLMProposedClaim;
  packet: EvidencePacket;
  providerName: string;
  modelName: string;
  promptVersion: string;
}): Omit<ValidatedLLMClaim, "novelty"> {
  const schemaIssues = validateProposalSchema(args.proposal, args.packet);
  const schemaValid = schemaIssues.length === 0;
  const claim = proposalToPerspectiveClaim(args);
  return {
    claim,
    proposal: args.proposal,
    experimentStatus: schemaValid ? "proposal" : "rejected",
    schemaValid,
    schemaIssues,
  };
}
