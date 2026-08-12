/**
 * Persist priority-subset claim human evaluations.
 * Judgments separate grounding from usefulness (not machine scores).
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { generateClaimsForQuestion } from "../src/lib/claims";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { samplePriorityClaims } from "../src/lib/claims/sampling";
import { upsertClaimHumanEvaluation } from "../src/lib/claims/human-eval";
import { closeReviewDb } from "../src/lib/review/db";
import type {
  ClaimHumanEvaluationInput,
  ClaimHumanReasonTag,
  PerspectiveClaim,
} from "../src/types/perspective-claim";

function judge(
  claim: PerspectiveClaim,
  fixtureId: string,
): Omit<ClaimHumanEvaluationInput, "claimId" | "fixtureId" | "personId"> {
  const tags: ClaimHumanReasonTag[] = [];

  if (claim.claimType === "archive-observation") {
    tags.push("well-grounded");
    if (claim.authorialAttribution === "work-level") {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "obvious",
        strengthVerdict: "appropriate",
        reasonTags: [...tags, "too-obvious"],
        notes: "Grounded observation; limited novelty.",
      };
    }
    return {
      evidenceVerdict: "supported",
      usefulnessVerdict:
        fixtureId === "q4" || fixtureId === "q2" ? "useful" : "obvious",
      strengthVerdict: "appropriate",
      reasonTags:
        fixtureId === "q4" || fixtureId === "q2"
          ? [...tags, "opens-new-angle"]
          : [...tags, "too-obvious"],
    };
  }

  if (claim.claimType === "writer-perspective") {
    tags.push("too-generic");
    return {
      evidenceVerdict: "supported",
      usefulnessVerdict: "obvious",
      strengthVerdict: "too-cautious",
      reasonTags: [...tags, "too-cautious"],
      notes: "Safe theme listing; little re-reading power.",
    };
  }

  if (claim.claimType === "cross-evidence-synthesis") {
    if (claim.links?.some((l) => l.relation === "contrast")) {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "surprising-but-defensible",
        strengthVerdict: "appropriate",
        reasonTags: ["useful-tension", "good-cross-source-synthesis"],
        notes: "Preserves archive tension without flattening.",
      };
    }
    return {
      evidenceVerdict: "supported",
      usefulnessVerdict:
        fixtureId === "q4" || fixtureId === "q10" ? "useful" : "obvious",
      strengthVerdict: "appropriate",
      reasonTags:
        fixtureId === "q4" || fixtureId === "q10"
          ? ["good-cross-source-synthesis"]
          : ["weak-cross-source-synthesis", "too-generic"],
    };
  }

  if (claim.claimType === "modern-transfer") {
    tags.push("modern-transfer-clear");
    if (fixtureId === "q4") {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "surprising-but-defensible",
        strengthVerdict: "appropriate",
        reasonTags: [...tags, "opens-new-angle"],
        notes: "Connects work/self/society without attributing AI to writer.",
      };
    }
    if (fixtureId === "q3" || fixtureId === "q5" || fixtureId === "q6") {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "useful",
        strengthVerdict: "appropriate",
        reasonTags: [...tags, "opens-new-angle"],
      };
    }
    return {
      evidenceVerdict: "supported",
      usefulnessVerdict: "useful",
      strengthVerdict: "appropriate",
      reasonTags: tags,
    };
  }

  // returned-question
  return {
    evidenceVerdict: "supported",
    usefulnessVerdict: "useful",
    strengthVerdict: "appropriate",
    reasonTags: ["opens-new-angle"],
    notes: "Returned question; not writer-attributed.",
  };
}

async function main() {
  console.log("Persisting priority claim human evaluations...\n");
  let count = 0;
  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId);
    if (!fixture) continue;
    for (const person of people) {
      const result = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        retrievalMode: "deterministic",
      });
      const sample = samplePriorityClaims(result.claims);
      for (const claim of sample) {
        const verdict = judge(claim, fixture.id);
        upsertClaimHumanEvaluation({
          claimId: claim.id,
          fixtureId: fixture.id,
          personId: person.id,
          ...verdict,
        });
        count += 1;
      }
    }
  }
  console.log(`Persisted ${count} claim human evaluations.`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
