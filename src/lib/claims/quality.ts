import type {
  ClaimQualitySummary,
  ClaimValidationResult,
  PerspectiveClaim,
} from "@/types/perspective-claim";

export function summarizeClaimQuality(
  claims: PerspectiveClaim[],
  validations?: ClaimValidationResult[],
): ClaimQualitySummary {
  const byId = new Map((validations ?? []).map((v) => [v.claimId, v]));
  let supported = 0;
  let partiallySupported = 0;
  let unsupported = 0;
  let unclear = 0;
  let allowed = 0;
  let blocked = 0;
  let attributionRiskCount = 0;
  let historicalRiskCount = 0;
  let workVoiceViolationCount = 0;

  for (const claim of claims) {
    if (claim.supportStatus === "supported") supported += 1;
    else if (claim.supportStatus === "partially-supported") {
      partiallySupported += 1;
    } else if (claim.supportStatus === "unsupported") unsupported += 1;
    else unclear += 1;

    if (claim.allowedInFinalPerspective) allowed += 1;
    else blocked += 1;

    const validation = byId.get(claim.id);
    if (validation?.attributionRisk === "high") attributionRiskCount += 1;
    if (validation?.historicalTransferRisk === "high") {
      historicalRiskCount += 1;
    }
    if (claim.validationIssues.includes("work-voice-misattribution")) {
      workVoiceViolationCount += 1;
    }
  }

  return {
    totalClaims: claims.length,
    supported,
    partiallySupported,
    unsupported,
    unclear,
    allowed,
    blocked,
    attributionRiskCount,
    historicalRiskCount,
    workVoiceViolationCount,
  };
}
