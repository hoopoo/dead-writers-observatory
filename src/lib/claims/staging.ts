import type {
  ClaimHumanEvaluation,
  PerspectiveClaim,
} from "@/types/perspective-claim";

const CRITICAL_ISSUES = new Set([
  "work-voice-misattribution",
  "modern-concept-attributed-to-writer",
  "authorial-overreach",
  "historical-overreach",
  "external-knowledge-injection",
  "writer-stereotype-injection",
  "evidence-id-invalid",
  "proposal-schema-invalid",
  "unsupported-certainty",
]);

/**
 * Deterministic claims: grounding approval (novelty not required).
 */
export function isDeterministicStagingEligible(
  claim: PerspectiveClaim,
  evaluation?: ClaimHumanEvaluation | null,
): boolean {
  if ((claim.generatorOrigin ?? "deterministic") === "llm") return false;
  if (!claim.allowedInFinalPerspective) return false;
  if (claim.supportStatus === "unsupported") return false;
  if (claim.validationIssues.some((i) => CRITICAL_ISSUES.has(i))) return false;
  if (!evaluation) return false;
  if (evaluation.evidenceVerdict !== "supported") return false;
  if (
    evaluation.usefulnessVerdict !== "useful" &&
    evaluation.usefulnessVerdict !== "surprising-but-defensible" &&
    // grounding anchors may be obvious but still useful as archive observation
    !(
      claim.claimType === "archive-observation" &&
      evaluation.usefulnessVerdict === "obvious"
    )
  ) {
    return false;
  }
  if (
    evaluation.strengthVerdict !== "appropriate" &&
    evaluation.strengthVerdict !== "unclear"
  ) {
    return false;
  }
  return true;
}

/**
 * LLM claims: require live human novelty + usefulness gate.
 * Unreviewed novelty cannot stage.
 */
export function isLlmStagingEligible(
  claim: PerspectiveClaim,
  evaluation?: ClaimHumanEvaluation | null,
): { ok: boolean; reason?: string } {
  if (claim.generatorOrigin !== "llm") {
    return { ok: false, reason: "not-llm" };
  }
  if (!evaluation) {
    return { ok: false, reason: "unreviewed" };
  }
  if (!evaluation.noveltyVerdict) {
    return { ok: false, reason: "novelty-unreviewed" };
  }
  if (!claim.allowedInFinalPerspective) {
    return { ok: false, reason: "validator-blocked" };
  }
  if (claim.supportStatus === "unsupported") {
    return { ok: false, reason: "unsupported" };
  }
  if (claim.validationIssues.some((i) => CRITICAL_ISSUES.has(i))) {
    return { ok: false, reason: "critical-issue" };
  }
  if (evaluation.evidenceVerdict !== "supported") {
    return { ok: false, reason: evaluation.evidenceVerdict };
  }
  if (
    evaluation.usefulnessVerdict !== "useful" &&
    evaluation.usefulnessVerdict !== "surprising-but-defensible"
  ) {
    return { ok: false, reason: evaluation.usefulnessVerdict };
  }
  if (
    evaluation.strengthVerdict !== "appropriate" &&
    evaluation.strengthVerdict !== "unclear"
  ) {
    return { ok: false, reason: evaluation.strengthVerdict };
  }
  if (
    evaluation.noveltyVerdict === "duplicate" ||
    evaluation.noveltyVerdict === "stereotype"
  ) {
    return { ok: false, reason: evaluation.noveltyVerdict };
  }
  if (
    evaluation.noveltyVerdict !== "new-angle" &&
    evaluation.noveltyVerdict !== "useful-rephrase"
  ) {
    return { ok: false, reason: evaluation.noveltyVerdict };
  }
  return { ok: true };
}

export function isTrueLlmAddedValue(
  claim: PerspectiveClaim,
  evaluation?: ClaimHumanEvaluation | null,
): boolean {
  const gate = isLlmStagingEligible(claim, evaluation);
  return gate.ok && evaluation?.noveltyVerdict === "new-angle";
}
