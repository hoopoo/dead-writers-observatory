import { getPersonById } from "@/data/people";
import { getClaimHumanEvaluation } from "@/lib/claims/human-eval";
import { analyzeWriterDiversity } from "@/lib/claims/distinctiveness";
import { buildApprovedClaimPool, defaultClaimSetSelector } from "@/lib/claims/selector";
import type {
  ApprovedClaimSet,
  ClaimHumanEvaluation,
  EvidenceBoundedPerspectiveSkeleton,
  PerspectiveAvailability,
  PerspectiveClaim,
} from "@/types/perspective-claim";

export function isHumanApprovedClaim(
  claim: PerspectiveClaim,
  evaluation?: ClaimHumanEvaluation | null,
): boolean {
  if (!claim.allowedInFinalPerspective) return false;
  if (!evaluation) return false;
  if (evaluation.evidenceVerdict !== "supported") return false;
  if (
    evaluation.usefulnessVerdict !== "useful" &&
    evaluation.usefulnessVerdict !== "surprising-but-defensible"
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

export function buildApprovedClaimSet(
  personId: string,
  claims: PerspectiveClaim[],
  evaluationsByClaimId: Map<string, ClaimHumanEvaluation>,
): ApprovedClaimSet {
  const approved = claims.filter((claim) =>
    isHumanApprovedClaim(claim, evaluationsByClaimId.get(claim.id)),
  );
  return {
    personId,
    archiveObservations: approved.filter(
      (c) => c.claimType === "archive-observation",
    ),
    writerPerspectives: approved.filter(
      (c) => c.claimType === "writer-perspective",
    ),
    syntheses: approved.filter(
      (c) => c.claimType === "cross-evidence-synthesis",
    ),
    modernTransfers: approved.filter((c) => c.claimType === "modern-transfer"),
    returnedQuestions: approved.filter(
      (c) => c.claimType === "returned-question",
    ),
  };
}

export function availabilityForSet(set: ApprovedClaimSet): PerspectiveAvailability {
  const types = [
    set.archiveObservations.length > 0,
    set.writerPerspectives.length > 0,
    set.syntheses.length > 0,
    set.modernTransfers.length > 0,
    set.returnedQuestions.length > 0,
  ].filter(Boolean).length;

  if (types >= 3) return "available";
  if (types >= 1) return "limited";
  return "insufficient";
}

function skeletonFromOrdered(args: {
  personId: string;
  question: string;
  ordered: PerspectiveClaim[];
  set: ApprovedClaimSet;
  staging?: boolean;
}): EvidenceBoundedPerspectiveSkeleton {
  const diversity = analyzeWriterDiversity(args.personId, args.ordered);
  const claimIds = args.ordered.map((c) => c.id);
  const evidenceIds = Array.from(
    new Set(args.ordered.flatMap((c) => c.evidenceIds)),
  );

  return {
    personId: args.personId,
    personName: getPersonById(args.personId)?.name ?? args.personId,
    question: args.question,
    availability: availabilityForSet(args.set),
    sections: {
      archiveObservation: args.set.archiveObservations
        .slice(0, 1)
        .map((c) => c.text),
      acrossSources: [
        ...args.set.writerPerspectives.slice(0, 1),
        ...args.set.syntheses.slice(0, 2),
      ].map((c) => c.text),
      connectionToQuestion: args.set.modernTransfers.slice(0, 2).map((c) => c.text),
      returnedQuestion: args.set.returnedQuestions.slice(0, 1).map((c) => c.text),
    },
    claimIds,
    evidenceIds,
    claims: args.ordered,
    humanReviewed: claimIds.length > 0,
    staging: args.staging,
    narrowArchiveConnection: diversity.narrowArchiveConnection,
    themeSaturation: diversity.themeSaturation,
  };
}

/**
 * Production / Experiment A skeleton: deterministic approved claims only.
 * Places Approved Claim.text only — no new prose synthesis.
 */
export function buildPerspectiveSkeleton(args: {
  personId: string;
  question: string;
  claims: PerspectiveClaim[];
  evaluationsByClaimId?: Map<string, ClaimHumanEvaluation>;
}): EvidenceBoundedPerspectiveSkeleton {
  const evaluations =
    args.evaluationsByClaimId ??
    new Map(
      args.claims
        .map((claim) => {
          const evaluation = getClaimHumanEvaluation({ claimId: claim.id });
          return evaluation ? ([claim.id, evaluation] as const) : null;
        })
        .filter((row): row is readonly [string, ClaimHumanEvaluation] =>
          Boolean(row),
        ),
    );

  const set = buildApprovedClaimSet(args.personId, args.claims, evaluations);
  const ordered = [
    ...set.archiveObservations.slice(0, 1),
    ...set.writerPerspectives.slice(0, 1),
    ...set.syntheses.slice(0, 2),
    ...set.modernTransfers.slice(0, 1),
    ...set.returnedQuestions.slice(0, 1),
  ];
  return skeletonFromOrdered({
    personId: args.personId,
    question: args.question,
    ordered,
    set: buildApprovedClaimSet(args.personId, ordered, evaluations),
    staging: false,
  });
}

/**
 * Experiment B staging skeleton: deterministic + human-approved LLM claims
 * via ClaimSetSelector. Unreviewed / stereotype / duplicate LLM claims excluded.
 */
export function buildStagingPerspectiveSkeleton(args: {
  personId: string;
  question: string;
  deterministicClaims: PerspectiveClaim[];
  llmClaims: PerspectiveClaim[];
  evaluationsByClaimId?: Map<string, ClaimHumanEvaluation>;
}): EvidenceBoundedPerspectiveSkeleton {
  const pool = buildApprovedClaimPool({
    personId: args.personId,
    question: args.question,
    deterministicClaims: args.deterministicClaims,
    llmClaims: args.llmClaims,
    evaluationsByClaimId: args.evaluationsByClaimId,
  });
  const { set, ordered } = defaultClaimSetSelector.select(pool, {
    includeLlm: true,
    maxClaims: 5,
  });
  return skeletonFromOrdered({
    personId: args.personId,
    question: args.question,
    ordered,
    set,
    staging: true,
  });
}

export const PRIORITY_CLAIM_FIXTURES = [
  "q4", // AI
  "q3", // SNS
  "q5", // success
  "q6", // aging
  "q2", // loneliness
  "q10", // death
] as const;

export const PRIORITY_CLAIM_TYPES = [
  "archive-observation",
  "writer-perspective",
  "cross-evidence-synthesis",
  "modern-transfer",
  "returned-question",
] as const;
