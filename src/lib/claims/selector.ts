import {
  getClaimHumanEvaluation,
  listClaimHumanEvaluations,
} from "@/lib/claims/human-eval";
import { filterRedundantClaims } from "@/lib/claims/redundancy";
import {
  isDeterministicStagingEligible,
  isLlmStagingEligible,
} from "@/lib/claims/staging";
import type {
  ApprovedClaimPool,
  ApprovedClaimSet,
  ClaimHumanEvaluation,
  ClaimSetSelectionContext,
  PerspectiveClaim,
} from "@/types/perspective-claim";

export function buildApprovedClaimPool(args: {
  personId: string;
  question: string;
  deterministicClaims: PerspectiveClaim[];
  llmClaims: PerspectiveClaim[];
  evaluationsByClaimId?: Map<string, ClaimHumanEvaluation>;
}): ApprovedClaimPool {
  const evaluations =
    args.evaluationsByClaimId ??
    new Map(
      listClaimHumanEvaluations({ personId: args.personId }).map((e) => [
        e.claimId,
        e,
      ]),
    );

  const excluded: ApprovedClaimPool["excluded"] = [];
  const deterministic: PerspectiveClaim[] = [];
  for (const claim of args.deterministicClaims) {
    const evaluation = evaluations.get(claim.id) ?? getClaimHumanEvaluation({
      claimId: claim.id,
    });
    if (isDeterministicStagingEligible(claim, evaluation)) {
      deterministic.push(claim);
    } else {
      excluded.push({
        claim,
        reason: evaluation ? "deterministic-not-eligible" : "unreviewed",
      });
    }
  }

  const llmHumanApproved: PerspectiveClaim[] = [];
  for (const claim of args.llmClaims) {
    const evaluation = evaluations.get(claim.id) ?? getClaimHumanEvaluation({
      claimId: claim.id,
    });
    const gate = isLlmStagingEligible(claim, evaluation);
    if (gate.ok) {
      llmHumanApproved.push(claim);
    } else {
      excluded.push({
        claim,
        reason: gate.reason ?? "llm-not-eligible",
      });
    }
  }

  return {
    personId: args.personId,
    question: args.question,
    deterministic,
    llmHumanApproved,
    excluded,
  };
}

function toApprovedSet(
  personId: string,
  claims: PerspectiveClaim[],
): ApprovedClaimSet {
  return {
    personId,
    archiveObservations: claims.filter(
      (c) => c.claimType === "archive-observation",
    ),
    writerPerspectives: claims.filter(
      (c) => c.claimType === "writer-perspective",
    ),
    syntheses: claims.filter((c) => c.claimType === "cross-evidence-synthesis"),
    modernTransfers: claims.filter((c) => c.claimType === "modern-transfer"),
    returnedQuestions: claims.filter((c) => c.claimType === "returned-question"),
  };
}

/**
 * Select a compact claim set: grounding + synthesis + modern + returned.
 * Prefer LLM new-angle when available; keep deterministic anchors.
 */
export class DefaultClaimSetSelector {
  select(
    pool: ApprovedClaimPool,
    context: ClaimSetSelectionContext = {},
  ): {
    set: ApprovedClaimSet;
    ordered: PerspectiveClaim[];
    removed: Array<{ claim: PerspectiveClaim; reason: string }>;
  } {
    const maxClaims = context.maxClaims ?? 5;
    const includeLlm = context.includeLlm ?? true;
    const candidates: PerspectiveClaim[] = [];

    const detByType = {
      archive: pool.deterministic.filter(
        (c) => c.claimType === "archive-observation",
      ),
      writer: pool.deterministic.filter(
        (c) => c.claimType === "writer-perspective",
      ),
      synthesis: pool.deterministic.filter(
        (c) => c.claimType === "cross-evidence-synthesis",
      ),
      modern: pool.deterministic.filter((c) => c.claimType === "modern-transfer"),
      returned: pool.deterministic.filter(
        (c) => c.claimType === "returned-question",
      ),
    };
    const llmByType = {
      synthesis: pool.llmHumanApproved.filter(
        (c) => c.claimType === "cross-evidence-synthesis",
      ),
      modern: pool.llmHumanApproved.filter(
        (c) => c.claimType === "modern-transfer",
      ),
      returned: pool.llmHumanApproved.filter(
        (c) => c.claimType === "returned-question",
      ),
    };

    // Prefer one grounding observation from deterministic
    if (detByType.archive[0]) candidates.push(detByType.archive[0]);

    // Synthesis: prefer LLM, fill with deterministic
    const synthesisPool = includeLlm
      ? [...llmByType.synthesis, ...detByType.synthesis]
      : [...detByType.synthesis];
    candidates.push(...synthesisPool.slice(0, 2));

    // Modern: prefer LLM
    const modernPool = includeLlm
      ? [...llmByType.modern, ...detByType.modern]
      : [...detByType.modern];
    candidates.push(...modernPool.slice(0, 2));

    // Returned: prefer LLM new-angle / rephrase then deterministic
    const returnedPool = includeLlm
      ? [...llmByType.returned, ...detByType.returned]
      : [...detByType.returned];
    if (returnedPool[0]) candidates.push(returnedPool[0]);

    // Optional writer-perspective if room
    if (candidates.length < maxClaims && detByType.writer[0]) {
      candidates.push(detByType.writer[0]);
    }

    // Deduplicate by id then redundancy filter
    const unique: PerspectiveClaim[] = [];
    const seen = new Set<string>();
    for (const claim of candidates) {
      if (seen.has(claim.id)) continue;
      seen.add(claim.id);
      unique.push(claim);
    }

    const { selected, removed } = filterRedundantClaims(unique);
    const ordered = selected.slice(0, maxClaims);
    return {
      set: toApprovedSet(pool.personId, ordered),
      ordered,
      removed,
    };
  }
}

export const defaultClaimSetSelector = new DefaultClaimSetSelector();
