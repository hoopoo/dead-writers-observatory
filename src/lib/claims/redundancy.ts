import { textSimilarity } from "@/lib/claims/llm/novelty";
import type {
  ClaimPairRelationship,
  PerspectiveClaim,
} from "@/types/perspective-claim";

const CONCEPT_MARKERS: Array<{ concept: string; pattern: RegExp }> = [
  { concept: "income", pattern: /収入|金銭|生活/ },
  { concept: "social-position", pattern: /社会.*位置|社会的役割|社会との関係/ },
  { concept: "self-image", pattern: /自己像|自己の価値|アイデンティティ/ },
  { concept: "gaze", pattern: /視線|他者.*見|他者評価|承認/ },
  { concept: "performance", pattern: /自己演出|演技|見せ/ },
  { concept: "anxiety", pattern: /不安|恐れ|恐怖/ },
  { concept: "independence", pattern: /独立|自己本位|個人/ },
  { concept: "observation", pattern: /自己観察|観察/ },
  { concept: "belonging", pattern: /帰属|親密|故郷/ },
  { concept: "death", pattern: /死|生き方/ },
  { concept: "aging", pattern: /老い|歳|役割の縮小/ },
];

export function extractConcepts(text: string): string[] {
  return CONCEPT_MARKERS.filter((m) => m.pattern.test(text)).map(
    (m) => m.concept,
  );
}

export function claimPairRelationship(
  a: PerspectiveClaim,
  b: PerspectiveClaim,
): ClaimPairRelationship {
  if (a.id === b.id) return "duplicate";
  const sim = textSimilarity(a.text, b.text);
  const conceptsA = new Set(extractConcepts(a.text));
  const conceptsB = new Set(extractConcepts(b.text));
  let shared = 0;
  for (const c of conceptsA) {
    if (conceptsB.has(c)) shared += 1;
  }
  const conceptOverlap =
    Math.max(conceptsA.size, conceptsB.size) === 0
      ? 0
      : shared / Math.max(conceptsA.size, conceptsB.size);

  if (sim >= 0.62 || (a.claimType === b.claimType && sim >= 0.5)) {
    return "duplicate";
  }
  if (
    sim >= 0.38 ||
    (a.claimType === b.claimType && conceptOverlap >= 0.66 && sim >= 0.28)
  ) {
    return "strong-overlap";
  }
  if (conceptOverlap >= 0.4 || sim >= 0.22) return "related";
  return "distinct";
}

export function filterRedundantClaims(
  claims: PerspectiveClaim[],
): {
  selected: PerspectiveClaim[];
  removed: Array<{ claim: PerspectiveClaim; reason: string }>;
} {
  const selected: PerspectiveClaim[] = [];
  const removed: Array<{ claim: PerspectiveClaim; reason: string }> = [];
  let strongOverlapKept = 0;

  for (const claim of claims) {
    const against = selected.map((s) => ({
      claim: s,
      rel: claimPairRelationship(claim, s),
    }));
    const dup = against.find((row) => row.rel === "duplicate");
    if (dup) {
      removed.push({
        claim,
        reason: `duplicate-of:${dup.claim.id}`,
      });
      continue;
    }
    const overlap = against.find((row) => row.rel === "strong-overlap");
    if (overlap) {
      if (strongOverlapKept >= 1) {
        removed.push({
          claim,
          reason: `strong-overlap-of:${overlap.claim.id}`,
        });
        continue;
      }
      strongOverlapKept += 1;
    }
    selected.push(claim);
  }
  return { selected, removed };
}
