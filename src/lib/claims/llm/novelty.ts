import type { PerspectiveClaim } from "@/types/perspective-claim";
import type {
  ClaimNovelty,
  ClaimNoveltyAssessment,
} from "@/lib/claims/llm/types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[「」『』、。．・\s]/g, "")
    .trim();
}

function charBigrams(text: string): Set<string> {
  const n = normalize(text);
  const grams = new Set<string>();
  for (let i = 0; i < n.length - 1; i += 1) {
    grams.add(n.slice(i, i + 2));
  }
  return grams;
}

export function textSimilarity(a: string, b: string): number {
  const A = charBigrams(a);
  const B = charBigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) {
    if (B.has(g)) inter += 1;
  }
  return inter / (A.size + B.size - inter);
}

export function assessNoveltyAgainst(
  claim: PerspectiveClaim,
  baselines: PerspectiveClaim[],
): ClaimNoveltyAssessment {
  const compared = baselines;
  let best = 0;
  let bestId: string | undefined;
  for (const other of compared) {
    const score = textSimilarity(claim.text, other.text);
    if (score > best) {
      best = score;
      bestId = other.id;
    }
  }

  // Also compare theme-overlap heuristic: shared source titles + similar claim type
  const sameType = baselines.filter((b) => b.claimType === claim.claimType);
  let typeBest = 0;
  for (const other of sameType) {
    typeBest = Math.max(typeBest, textSimilarity(claim.text, other.text));
  }

  let novelty: ClaimNovelty = "unclear";
  if (best >= 0.55 || typeBest >= 0.5) novelty = "duplicate";
  else if (best >= 0.32 || typeBest >= 0.28) novelty = "similar";
  else if (compared.length === 0) novelty = "unclear";
  else novelty = "new-angle";

  return {
    claimId: claim.id,
    comparedAgainstClaimIds: bestId
      ? [bestId]
      : compared.slice(0, 3).map((c) => c.id),
    novelty,
    notes: `bestSimilarity=${best.toFixed(2)};typeBest=${typeBest.toFixed(2)}`,
  };
}

/** Drop near-duplicates within an LLM proposal set (keep first). */
export function dedupeProposals(
  claims: PerspectiveClaim[],
  threshold = 0.7,
): PerspectiveClaim[] {
  const kept: PerspectiveClaim[] = [];
  for (const claim of claims) {
    const dup = kept.some((k) => textSimilarity(k.text, claim.text) >= threshold);
    if (!dup) kept.push(claim);
  }
  return kept;
}
