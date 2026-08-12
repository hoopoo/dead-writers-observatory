import type {
  ClaimType,
  PerspectiveClaim,
} from "@/types/perspective-claim";
import { PRIORITY_CLAIM_TYPES } from "@/lib/claims/approved";

/** Sample up to one claim per priority type for human review queue. */
export function samplePriorityClaims(
  claims: PerspectiveClaim[],
): PerspectiveClaim[] {
  const sampled: PerspectiveClaim[] = [];
  for (const type of PRIORITY_CLAIM_TYPES) {
    const found = claims.find((claim) => claim.claimType === type);
    if (found) sampled.push(found);
  }
  // Prefer tension/contrast synthesis if present and not already sampled
  const tension = claims.find(
    (claim) =>
      claim.claimType === "cross-evidence-synthesis" &&
      claim.links?.some((link) => link.relation === "contrast") &&
      !sampled.some((s) => s.id === claim.id),
  );
  if (tension && sampled.filter((c) => c.claimType === "cross-evidence-synthesis").length < 2) {
    sampled.push(tension);
  }
  return sampled;
}

export function claimTypeLabel(type: ClaimType): string {
  return type;
}
