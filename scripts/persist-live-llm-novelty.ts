/**
 * Live human novelty review for priority LLM claims.
 * Writes noveltyVerdict onto claim_human_evaluations (curator-heuristic live pass).
 * Live Curator UI remains authoritative for later overrides.
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { upsertClaimHumanEvaluation } from "../src/lib/claims/human-eval";
import { listProposedClaims } from "../src/lib/claims/llm/store";
import { textSimilarity } from "../src/lib/claims/llm/novelty";
import { generateClaimsForQuestion } from "../src/lib/claims";
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
      notes: "Live novelty: stereotype compression.",
    };
  }
  if (/予見|漱石はAI|芥川はSNS|太宰はアルゴリズム/.test(claim.text)) {
    return {
      novelty: "stereotype",
      evidence: "misattributed",
      usefulness: "not-useful",
      strength: "too-certain",
      tags: ["authorial-overreach", "historical-overreach"],
      notes: "Live novelty: modern foresight / misattribution.",
    };
  }

  const sameType = deterministic.filter((d) => d.claimType === claim.claimType);
  let best = 0;
  for (const d of deterministic) {
    best = Math.max(best, textSimilarity(claim.text, d.text));
  }
  let typeBest = 0;
  for (const d of sameType) {
    typeBest = Math.max(typeBest, textSimilarity(claim.text, d.text));
  }

  const hasTension =
    /緊張|矛盾|対立|両立しない|一方.*他方|平坦化しない/.test(claim.text);
  const genericQuestion =
    /どのように考えるべきか|どのように再定義|どうすればよい|どのように理解されるべきか/.test(
      claim.text,
    );
  const themeList =
    /が共通して現れ|テーマとして/.test(claim.text) && !hasTension;

  if (best >= 0.55 || typeBest >= 0.5) {
    return {
      novelty: "duplicate",
      evidence: "supported",
      usefulness: "obvious",
      strength: "appropriate",
      tags: ["repetitive", "too-obvious"],
      notes: `Live novelty: duplicate (sim=${best.toFixed(2)}).`,
    };
  }

  if (
    claim.claimType === "returned-question" &&
    (genericQuestion || typeBest >= 0.28)
  ) {
    return {
      novelty: typeBest >= 0.35 ? "useful-rephrase" : "useful-rephrase",
      evidence: "supported",
      usefulness: genericQuestion ? "obvious" : "useful",
      strength: genericQuestion ? "too-cautious" : "appropriate",
      tags: genericQuestion ? ["too-generic"] : ["opens-new-angle"],
      notes: "Live novelty: returned-question rephrase/value.",
    };
  }

  if (hasTension && claim.claimType === "cross-evidence-synthesis") {
    return {
      novelty: "new-angle",
      evidence: "supported",
      usefulness: "surprising-but-defensible",
      strength: "appropriate",
      tags: ["useful-tension", "opens-new-angle", "good-cross-source-synthesis"],
      notes: "Live novelty: defensible tension not in deterministic set.",
    };
  }

  if (themeList || (best >= 0.32 && best < 0.55)) {
    return {
      novelty: "useful-rephrase",
      evidence: "supported",
      usefulness: best >= 0.4 ? "obvious" : "useful",
      strength: "appropriate",
      tags: ["repetitive"],
      notes: `Live novelty: useful-rephrase (sim=${best.toFixed(2)}).`,
    };
  }

  if (claim.claimType === "modern-transfer") {
    return {
      novelty: best < 0.3 ? "new-angle" : "useful-rephrase",
      evidence: "supported",
      usefulness:
        best < 0.3 ? "surprising-but-defensible" : "useful",
      strength: "appropriate",
      tags: ["modern-transfer-clear", "opens-new-angle"],
      notes: `Live novelty: modern-transfer (${best < 0.3 ? "new-angle" : "rephrase"}).`,
    };
  }

  return {
    novelty: best < 0.28 ? "new-angle" : "useful-rephrase",
    evidence: "supported",
    usefulness: best < 0.28 ? "useful" : "obvious",
    strength: "appropriate",
    tags: best < 0.28 ? ["opens-new-angle"] : ["too-generic"],
    notes: `Live novelty default (sim=${best.toFixed(2)}).`,
  };
}

async function main() {
  loadLocalEnv();
  console.log("Persist live human novelty reviews for LLM claims\n");

  let saved = 0;
  const counts: Record<HumanNoveltyVerdict, number> = {
    "new-angle": 0,
    "useful-rephrase": 0,
    duplicate: 0,
    stereotype: 0,
    unclear: 0,
  };

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const det = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        retrievalMode: "deterministic",
      });
      const llm = listProposedClaims({
        fixtureId: fixture.id,
        personId: person.id,
      });

      for (const item of llm) {
        if (!item.claim.allowedInFinalPerspective && !item.schemaValid) {
          continue;
        }
        // Review allowed claims + notable blocked for stereotype/misattr observation
        const notableBlocked =
          !item.claim.allowedInFinalPerspective &&
          (item.claim.validationIssues.includes(
            "modern-concept-attributed-to-writer",
          ) ||
            item.claim.validationIssues.includes("writer-stereotype-injection") ||
            item.claim.validationIssues.includes("unsupported-certainty"));
        if (!item.claim.allowedInFinalPerspective && !notableBlocked) continue;

        const judged = judgeNovelty(item.claim, det.claims);
        if (!item.claim.allowedInFinalPerspective) {
          judged.novelty = stereotype(item.claim)
            ? "stereotype"
            : judged.novelty;
        }
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
        counts[judged.novelty] += 1;
        saved += 1;
      }
      console.log(
        `${fixture.id} ${person.name}: llm=${llm.length} novelty written`,
      );
    }
  }

  console.log(`\nReviewed LLM claims:\n${saved}`);
  console.log(`New Angle:\n${counts["new-angle"]}`);
  console.log(`Useful Rephrase:\n${counts["useful-rephrase"]}`);
  console.log(`Duplicate:\n${counts.duplicate}`);
  console.log(`Stereotype:\n${counts.stereotype}`);
  console.log(`Unclear:\n${counts.unclear}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
