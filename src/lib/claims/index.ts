import { analyzeQuestion } from "@/lib/question-analysis";
import { createRetriever, getRetrievalMode } from "@/lib/retrieval-mode";
import { buildEvidencePacket } from "@/lib/claims/evidence-packet";
import {
  defaultClaimGenerator,
  DeterministicClaimGenerator,
} from "@/lib/claims/deterministic-generator";
import {
  applyValidation,
  defaultClaimValidator,
} from "@/lib/claims/validator";
import { summarizeClaimQuality } from "@/lib/claims/quality";
import type { RetrievalMode } from "@/types/embedding";
import type {
  ClaimCaseResult,
  GenerationMode,
  PerspectiveClaimGenerator,
} from "@/types/perspective-claim";

export function getGenerationMode(): GenerationMode {
  const raw = (process.env.GENERATION_MODE ?? "deterministic-claims").toLowerCase();
  if (
    raw === "llm-claims" ||
    raw === "llm-prose" ||
    raw === "deterministic-claims"
  ) {
    return raw;
  }
  return "deterministic-claims";
}

export function createClaimGenerator(
  mode: GenerationMode = getGenerationMode(),
): PerspectiveClaimGenerator {
  // Public /observe and skeleton stay on deterministic claims.
  // llm-claims is experiment-only via /curator/claim-experiments + eval scripts.
  // llm-prose remains unimplemented.
  if (mode === "llm-claims" || mode === "llm-prose") {
    return defaultClaimGenerator;
  }
  return defaultClaimGenerator;
}

export async function generateClaimsForQuestion(args: {
  question: string;
  personId: string;
  fixtureId?: string;
  retrievalMode?: RetrievalMode;
  generator?: PerspectiveClaimGenerator;
}): Promise<ClaimCaseResult> {
  const analysis = analyzeQuestion(args.question);
  const retrievalMode = args.retrievalMode ?? getRetrievalMode();
  const { mode, retriever } = createRetriever(retrievalMode);
  const selected = await retriever.retrieve(args.personId, analysis);
  const { packet } = buildEvidencePacket({
    personId: args.personId,
    analysis,
    selected,
    retrievalMode: mode,
  });

  const generator = args.generator ?? new DeterministicClaimGenerator();
  const rawClaims = await generator.generate(packet);
  const validations = rawClaims.map((claim) =>
    defaultClaimValidator.validate(claim, packet),
  );
  const claims = rawClaims.map((claim, index) =>
    applyValidation(claim, validations[index]),
  );

  return {
    fixtureId: args.fixtureId ?? "",
    personId: args.personId,
    packet,
    claims,
    validations,
    quality: summarizeClaimQuality(claims, validations),
  };
}

export {
  buildEvidencePacket,
  validateEvidenceForPacket,
} from "@/lib/claims/evidence-packet";
export { DeterministicClaimGenerator, defaultClaimGenerator } from "@/lib/claims/deterministic-generator";
export {
  DefaultClaimValidator,
  defaultClaimValidator,
  applyValidation,
} from "@/lib/claims/validator";
export { summarizeClaimQuality } from "@/lib/claims/quality";
export {
  upsertClaimHumanEvaluation,
  getClaimHumanEvaluation,
  listClaimHumanEvaluations,
  exportClaimHumanEvaluationsJson,
} from "@/lib/claims/human-eval";
export {
  isHumanApprovedClaim,
  buildApprovedClaimSet,
  buildPerspectiveSkeleton,
  buildStagingPerspectiveSkeleton,
  PRIORITY_CLAIM_FIXTURES,
} from "@/lib/claims/approved";
export { samplePriorityClaims } from "@/lib/claims/sampling";
export { summarizeClaimHumanEvaluations } from "@/lib/claims/human-summary";
export { runLlmClaimExperimentCase } from "@/lib/claims/llm/experiment";
export {
  createClaimLLMProvider,
  ClaimLLMProviderUnavailableError,
} from "@/lib/claims/llm/provider";
export {
  isLlmStagingEligible,
  isDeterministicStagingEligible,
  isTrueLlmAddedValue,
} from "@/lib/claims/staging";
export {
  buildApprovedClaimPool,
  defaultClaimSetSelector,
} from "@/lib/claims/selector";
export {
  analyzeCrossWriterDistinctiveness,
  analyzeWriterDiversity,
  buildWriterFingerprint,
} from "@/lib/claims/distinctiveness";
