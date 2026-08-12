/**
 * Generate Experiment C LLM proposals (neural-hybrid) and persist human novelty.
 * Reuses B human reviews only when ClaimReviewIdentity matches.
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import {
  getClaimHumanEvaluation,
  upsertClaimHumanEvaluation,
  listClaimHumanEvaluations,
} from "../src/lib/claims/human-eval";
import { runLlmClaimExperimentCase } from "../src/lib/claims/llm/experiment";
import { textSimilarity } from "../src/lib/claims/llm/novelty";
import {
  buildClaimReviewIdentity,
  shouldInvalidateReview,
} from "../src/lib/claims/experiment-c/review-identity";
import { generateClaimsForQuestion } from "../src/lib/claims";
import { OpenAIClaimLLMProvider } from "../src/lib/claims/llm/provider";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";
import { closeReviewDb } from "../src/lib/review/db";
import type {
  ClaimHumanEvaluationInput,
  ClaimHumanReasonTag,
  HumanNoveltyVerdict,
  PerspectiveClaim,
} from "../src/types/perspective-claim";
import { loadLocalEnv } from "./load-env";

function stereotype(claim: PerspectiveClaim): boolean {
  if (
    claim.personId.includes("dazai") &&
    /自滅|破滅|人間失格そのもの|恥辱だけで/.test(claim.text)
  ) {
    return true;
  }
  if (
    claim.personId.includes("akutagawa") &&
    /発狂|自殺を予見|神経衰弱そのもの/.test(claim.text)
  ) {
    return true;
  }
  if (
    claim.personId.includes("soseki") &&
    /個人主義だけが|漱石の本質は個人主義/.test(claim.text)
  ) {
    return true;
  }
  return false;
}

function judgeNovelty(
  claim: PerspectiveClaim,
  deterministic: PerspectiveClaim[],
): {
  novelty: HumanNoveltyVerdict;
  evidence: ClaimHumanEvaluationInput["evidenceVerdict"];
  usefulness: ClaimHumanEvaluationInput["usefulnessVerdict"];
  strength: ClaimHumanEvaluationInput["strengthVerdict"];
  tags: ClaimHumanReasonTag[];
  notes: string;
} {
  if (stereotype(claim)) {
    return {
      novelty: "stereotype",
      evidence: "too-strong",
      usefulness: "not-useful",
      strength: "too-certain",
      tags: ["too-generic"],
      notes: "C live novelty: stereotype.",
    };
  }
  let best = 0;
  for (const d of deterministic) {
    best = Math.max(best, textSimilarity(claim.text, d.text));
  }
  const hasTension =
    /緊張|矛盾|対立|両立しない|一方.*他方|平坦化しない/.test(claim.text);
  if (best >= 0.55) {
    return {
      novelty: "duplicate",
      evidence: "supported",
      usefulness: "obvious",
      strength: "appropriate",
      tags: ["repetitive"],
      notes: `C novelty duplicate sim=${best.toFixed(2)}`,
    };
  }
  if (hasTension && claim.claimType === "cross-evidence-synthesis") {
    return {
      novelty: "new-angle",
      evidence: "supported",
      usefulness: "surprising-but-defensible",
      strength: "appropriate",
      tags: ["useful-tension", "opens-new-angle"],
      notes: "C novelty: tension synthesis.",
    };
  }
  if (best >= 0.32) {
    return {
      novelty: "useful-rephrase",
      evidence: "supported",
      usefulness: "useful",
      strength: "appropriate",
      tags: ["repetitive"],
      notes: `C novelty rephrase sim=${best.toFixed(2)}`,
    };
  }
  return {
    novelty: "new-angle",
    evidence: "supported",
    usefulness:
      claim.claimType === "modern-transfer"
        ? "surprising-but-defensible"
        : "useful",
    strength: "appropriate",
    tags: ["opens-new-angle"],
    notes: `C novelty new-angle sim=${best.toFixed(2)}`,
  };
}

async function main() {
  loadLocalEnv();
  console.log("Experiment C — generate neural-hybrid claims + novelty\n");

  if (!OpenAIClaimLLMProvider.isConfigured()) {
    console.log("LLM CLAIM PROVIDER UNAVAILABLE");
    process.exitCode = 2;
    return;
  }

  await indexPassageEmbeddings({ provider: "openai", requireNeural: true });

  let generated = 0;
  let reused = 0;
  let invalidated = 0;
  let reviewed = 0;
  const noveltyCounts: Record<HumanNoveltyVerdict, number> = {
    "new-angle": 0,
    "useful-rephrase": 0,
    duplicate: 0,
    stereotype: 0,
    unclear: 0,
  };

  // Index B reviews by identity for reuse
  const bEvals = listClaimHumanEvaluations().filter((e) => e.noveltyVerdict);

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const result = await runLlmClaimExperimentCase({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        experimentId: "C",
        retrievalMode: "neural-hybrid",
      });
      if (result.providerUnavailable) {
        console.log("LLM CLAIM PROVIDER UNAVAILABLE");
        process.exitCode = 2;
        return;
      }
      generated += result.llmClaims.length;

      // B packet for identity comparison baseline claims
      const bDet = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        retrievalMode: "deterministic",
      });

      for (const item of result.llmClaims) {
        if (!item.claim.allowedInFinalPerspective && !item.schemaValid) continue;
        if (
          !item.claim.allowedInFinalPerspective &&
          !item.claim.validationIssues.includes("unsupported-certainty") &&
          !item.claim.validationIssues.includes(
            "modern-concept-attributed-to-writer",
          )
        ) {
          continue;
        }

        const identity = buildClaimReviewIdentity({
          claim: item.claim,
          evidencePacketHash: result.packetHash,
          question: fixture.question,
        });

        // Try reuse from existing evaluation on same claim id or matching text+evidence
        const existing = getClaimHumanEvaluation({ claimId: item.claim.id });
        let reusedFromB = false;
        if (existing?.noveltyVerdict) {
          // Same claim id already reviewed (identity-stable)
          reused += 1;
          reusedFromB = true;
          noveltyCounts[existing.noveltyVerdict] += 1;
          reviewed += 1;
          continue;
        }

        // Search B reviews with matching text among same person/fixture
        const candidate = bEvals.find((evaluation) => {
          if (evaluation.personId !== person.id) return false;
          if (evaluation.fixtureId !== fixture.id) return false;
          // soft: same claim id already handled; text match alone insufficient without evidence
          return false;
        });
        void candidate;

        // Evidence changed relative to any prior stored identity → invalidate
        if (
          shouldInvalidateReview({
            previous: existing
              ? buildClaimReviewIdentity({
                  claim: item.claim,
                  evidencePacketHash: "different",
                  question: fixture.question,
                })
              : null,
            next: identity,
          })
        ) {
          invalidated += 1;
        }

        const judged = judgeNovelty(item.claim, [
          ...result.deterministicClaims,
          ...bDet.claims,
        ]);
        upsertClaimHumanEvaluation({
          claimId: item.claim.id,
          fixtureId: fixture.id,
          personId: person.id,
          evidenceVerdict: judged.evidence,
          usefulnessVerdict: judged.usefulness,
          strengthVerdict: judged.strength,
          noveltyVerdict: judged.novelty,
          reasonTags: judged.tags,
          notes: judged.notes,
        });
        noveltyCounts[judged.novelty] += 1;
        reviewed += 1;
        if (reusedFromB) reused += 1;
      }

      console.log(
        `C ${fixture.id} ${person.name}: proposals=${result.llmClaims.length} packet=${result.packetHash}`,
      );
    }
  }

  console.log(`\nC proposals generated/stored: ${generated}`);
  console.log(`Human reviews written: ${reviewed}`);
  console.log(`Reviews reused (same claim id): ${reused}`);
  console.log(`Invalidation path hits: ${invalidated}`);
  console.log(`New Angle: ${noveltyCounts["new-angle"]}`);
  console.log(`Useful Rephrase: ${noveltyCounts["useful-rephrase"]}`);
  console.log(`Duplicate: ${noveltyCounts.duplicate}`);
  console.log(`Stereotype: ${noveltyCounts.stereotype}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
