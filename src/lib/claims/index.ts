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
  // LLM modes are not wired yet — always deterministic for now.
  void mode;
  return defaultClaimGenerator;
}

export async function generateClaimsForQuestion(args: {
  question: string;
  personId: string;
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
    fixtureId: "",
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
