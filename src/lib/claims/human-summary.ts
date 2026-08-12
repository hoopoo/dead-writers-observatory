import type {
  ClaimHumanEvaluation,
  ClaimType,
  PerspectiveClaim,
} from "@/types/perspective-claim";

export interface ClaimHumanSummary {
  reviewed: number;
  groundingRate: number;
  overstatementRate: number;
  misattributionRate: number;
  usefulnessRate: number;
  surprisingRate: number;
  obviousRate: number;
  notUsefulRate: number;
  evidenceSupported: number;
  tooStrong: number;
  tooWeak: number;
  misattributed: number;
  useful: number;
  surprising: number;
  obvious: number;
  notUseful: number;
  strengthAppropriate: number;
  strengthTooCautious: number;
  strengthTooCertain: number;
  byType: Record<
    string,
    {
      reviewed: number;
      useful: number;
      surprising: number;
      obvious: number;
      notUseful: number;
    }
  >;
}

export function summarizeClaimHumanEvaluations(args: {
  evaluations: ClaimHumanEvaluation[];
  claimsById: Map<string, PerspectiveClaim>;
}): ClaimHumanSummary {
  const { evaluations, claimsById } = args;
  const reviewed = evaluations.length;
  const pct = (n: number) => (reviewed === 0 ? 0 : (n / reviewed) * 100);

  const evidenceSupported = evaluations.filter(
    (e) => e.evidenceVerdict === "supported",
  ).length;
  const tooStrong = evaluations.filter(
    (e) => e.evidenceVerdict === "too-strong",
  ).length;
  const tooWeak = evaluations.filter(
    (e) => e.evidenceVerdict === "too-weak",
  ).length;
  const misattributed = evaluations.filter(
    (e) => e.evidenceVerdict === "misattributed",
  ).length;
  const useful = evaluations.filter(
    (e) => e.usefulnessVerdict === "useful",
  ).length;
  const surprising = evaluations.filter(
    (e) => e.usefulnessVerdict === "surprising-but-defensible",
  ).length;
  const obvious = evaluations.filter(
    (e) => e.usefulnessVerdict === "obvious",
  ).length;
  const notUseful = evaluations.filter(
    (e) => e.usefulnessVerdict === "not-useful",
  ).length;

  const byType: ClaimHumanSummary["byType"] = {};
  for (const evaluation of evaluations) {
    const claim = claimsById.get(evaluation.claimId);
    const type = (claim?.claimType ?? "unknown") as ClaimType | "unknown";
    if (!byType[type]) {
      byType[type] = {
        reviewed: 0,
        useful: 0,
        surprising: 0,
        obvious: 0,
        notUseful: 0,
      };
    }
    byType[type].reviewed += 1;
    if (evaluation.usefulnessVerdict === "useful") byType[type].useful += 1;
    if (evaluation.usefulnessVerdict === "surprising-but-defensible") {
      byType[type].surprising += 1;
    }
    if (evaluation.usefulnessVerdict === "obvious") byType[type].obvious += 1;
    if (evaluation.usefulnessVerdict === "not-useful") {
      byType[type].notUseful += 1;
    }
  }

  return {
    reviewed,
    groundingRate: pct(evidenceSupported),
    overstatementRate: pct(tooStrong),
    misattributionRate: pct(misattributed),
    usefulnessRate: pct(useful + surprising),
    surprisingRate: pct(surprising),
    obviousRate: pct(obvious),
    notUsefulRate: pct(notUseful),
    evidenceSupported,
    tooStrong,
    tooWeak,
    misattributed,
    useful,
    surprising,
    obvious,
    notUseful,
    strengthAppropriate: evaluations.filter(
      (e) => e.strengthVerdict === "appropriate",
    ).length,
    strengthTooCautious: evaluations.filter(
      (e) => e.strengthVerdict === "too-cautious",
    ).length,
    strengthTooCertain: evaluations.filter(
      (e) => e.strengthVerdict === "too-certain",
    ).length,
    byType,
  };
}

export function machineHumanDisagreement(args: {
  claim: PerspectiveClaim;
  evaluation: ClaimHumanEvaluation;
}): string | null {
  const machine = args.claim.supportStatus;
  const human = args.evaluation.evidenceVerdict;
  if (machine === "supported" && human === "too-strong") {
    return "Machine SUPPORTED / Human TOO STRONG";
  }
  if (machine === "supported" && human === "misattributed") {
    return "Machine SUPPORTED / Human MISATTRIBUTED";
  }
  if (
    machine === "partially-supported" &&
    human === "supported"
  ) {
    return "Machine PARTIALLY SUPPORTED / Human SUPPORTED";
  }
  if (machine === "partially-supported" && human === "too-strong") {
    return "Machine PARTIAL / Human TOO STRONG";
  }
  return null;
}
