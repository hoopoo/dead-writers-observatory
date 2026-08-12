import { getPersonById } from "@/data/people";
import { getClaimHumanEvaluation } from "@/lib/claims/human-eval";
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

/**
 * Skeleton places Approved Claim.text only — no new prose synthesis.
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
    ...set.archiveObservations.slice(0, 2),
    ...set.writerPerspectives.slice(0, 1),
    ...set.syntheses.slice(0, 2),
    ...set.modernTransfers.slice(0, 1),
    ...set.returnedQuestions.slice(0, 1),
  ];
  const claimIds = ordered.map((c) => c.id);
  const evidenceIds = Array.from(
    new Set(ordered.flatMap((c) => c.evidenceIds)),
  );

  return {
    personId: args.personId,
    personName: getPersonById(args.personId)?.name ?? args.personId,
    question: args.question,
    availability: availabilityForSet(set),
    sections: {
      archiveObservation: set.archiveObservations
        .slice(0, 2)
        .map((c) => c.text),
      acrossSources: [
        ...set.writerPerspectives.slice(0, 1),
        ...set.syntheses.slice(0, 2),
      ].map((c) => c.text),
      connectionToQuestion: set.modernTransfers.slice(0, 1).map((c) => c.text),
      returnedQuestion: set.returnedQuestions.slice(0, 1).map((c) => c.text),
    },
    claimIds,
    evidenceIds,
    claims: ordered,
    humanReviewed: claimIds.length > 0,
  };
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
