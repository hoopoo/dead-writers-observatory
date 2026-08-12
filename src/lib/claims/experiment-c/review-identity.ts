import { createHash } from "node:crypto";
import type { PerspectiveClaim } from "@/types/perspective-claim";
import type { ClaimReviewIdentity } from "@/lib/claims/experiment-c/types";

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function buildClaimReviewIdentity(args: {
  claim: PerspectiveClaim;
  evidencePacketHash: string;
  question: string;
}): ClaimReviewIdentity {
  return {
    claimTextHash: hashText(args.claim.text.trim()),
    evidencePacketHash: args.evidencePacketHash,
    evidenceIds: [...args.claim.evidenceIds].sort(),
    personId: args.claim.personId,
    questionHash: hashText(args.question.trim()),
  };
}

export function identitiesMatch(
  a: ClaimReviewIdentity,
  b: ClaimReviewIdentity,
): boolean {
  if (a.claimTextHash !== b.claimTextHash) return false;
  if (a.evidencePacketHash !== b.evidencePacketHash) return false;
  if (a.personId !== b.personId) return false;
  if (a.questionHash !== b.questionHash) return false;
  if (a.evidenceIds.length !== b.evidenceIds.length) return false;
  return a.evidenceIds.every((id, i) => id === b.evidenceIds[i]);
}

/** Evidence changed → do not inherit human review automatically. */
export function shouldInvalidateReview(args: {
  previous?: ClaimReviewIdentity | null;
  next: ClaimReviewIdentity;
}): boolean {
  if (!args.previous) return true;
  return !identitiesMatch(args.previous, args.next);
}
