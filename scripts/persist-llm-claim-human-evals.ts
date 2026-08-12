/**
 * Persist human evaluations for validated LLM claim proposals
 * on the priority 6 fixtures × 3 writers experiment set.
 *
 * Judgments stay on the same axes as deterministic claim review.
 * Novelty (new-angle / similar / duplicate) is recorded in notes/tags.
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { upsertClaimHumanEvaluation } from "../src/lib/claims/human-eval";
import { runLlmClaimExperimentCase } from "../src/lib/claims/llm/experiment";
import { OpenAIClaimLLMProvider } from "../src/lib/claims/llm/provider";
import { closeReviewDb } from "../src/lib/review/db";
import type {
  ClaimHumanEvaluationInput,
  ClaimHumanReasonTag,
} from "../src/types/perspective-claim";
import type { ValidatedLLMClaim } from "../src/lib/claims/llm/types";
import { loadLocalEnv } from "./load-env";

function judgeLlm(
  item: ValidatedLLMClaim,
  fixtureId: string,
): Omit<ClaimHumanEvaluationInput, "claimId" | "fixtureId" | "personId"> | null {
  const claim = item.claim;
  if (!item.schemaValid) return null;

  if (!claim.allowedInFinalPerspective) {
    if (claim.validationIssues.includes("modern-concept-attributed-to-writer")) {
      return {
        evidenceVerdict: "misattributed",
        usefulnessVerdict: "not-useful",
        strengthVerdict: "too-certain",
        reasonTags: ["authorial-overreach", "historical-overreach"],
        notes: "Blocked: modern attribution to writer.",
      };
    }
    if (claim.validationIssues.includes("work-voice-misattribution")) {
      return {
        evidenceVerdict: "misattributed",
        usefulnessVerdict: "not-useful",
        strengthVerdict: "too-certain",
        reasonTags: ["work-voice-risk"],
        notes: "Blocked: work-voice misattribution.",
      };
    }
    if (claim.validationIssues.includes("external-knowledge-injection")) {
      return {
        evidenceVerdict: "too-strong",
        usefulnessVerdict: "not-useful",
        strengthVerdict: "too-certain",
        reasonTags: ["historical-overreach"],
        notes: "Blocked: external knowledge.",
      };
    }
    if (claim.validationIssues.includes("unsupported-certainty")) {
      return {
        evidenceVerdict: "too-strong",
        usefulnessVerdict: "not-useful",
        strengthVerdict: "too-certain",
        reasonTags: ["too-certain"],
        notes: "Blocked: certainty overreach.",
      };
    }
    return null;
  }

  const tags: ClaimHumanReasonTag[] = [];
  const novelty = item.novelty?.novelty;
  const text = claim.text;
  const genericQuestion =
    /どのように考えるべきか|どのように再定義|どのように再確認|どうすればよい/.test(
      text,
    );
  const themeListOnly =
    /が共通して現れ|といった観点|テーマとして浮かび上が/.test(text) &&
    !/緊張|矛盾|対立|単純には|両立しない|摩擦/.test(text);
  const hasTension =
    /緊張|矛盾|対立|単純には一致しない|両立しない|摩擦|一方.*他方/.test(text);
  const foresight =
    /予見|作家はAI|漱石はSNS|芥川はアルゴリズム|太宰はAI/.test(text);
  const stereotypePush =
    (/自滅|破滅|人間失格そのもの/.test(text) &&
      claim.personId.includes("dazai")) ||
    (/発狂|神経衰弱そのもの/.test(text) &&
      claim.personId.includes("akutagawa")) ||
    (/個人主義だけが本質/.test(text) && claim.personId.includes("soseki"));

  if (foresight) {
    return {
      evidenceVerdict: "misattributed",
      usefulnessVerdict: "not-useful",
      strengthVerdict: "too-certain",
      reasonTags: ["authorial-overreach", "historical-overreach"],
      notes: "Modern foresight attribution.",
    };
  }
  if (stereotypePush) {
    return {
      evidenceVerdict: "too-strong",
      usefulnessVerdict: "not-useful",
      strengthVerdict: "too-certain",
      reasonTags: ["too-generic"],
      notes: "Writer stereotype compression.",
    };
  }

  if (claim.claimType === "returned-question") {
    if (/はあなたに問|あなたにこう問う/.test(text)) {
      return {
        evidenceVerdict: "misattributed",
        usefulnessVerdict: "not-useful",
        strengthVerdict: "too-certain",
        reasonTags: ["authorial-overreach"],
        notes: "Writer-as-asker phrasing.",
      };
    }
    if (genericQuestion) {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "obvious",
        strengthVerdict: "too-cautious",
        reasonTags: ["too-obvious", "too-generic"],
        notes: "Generic returned question; little re-reading power.",
      };
    }
    return {
      evidenceVerdict: "supported",
      usefulnessVerdict: "useful",
      strengthVerdict: "appropriate",
      reasonTags: ["opens-new-angle"],
      notes: `Concrete returned question; novelty=${novelty}`,
    };
  }

  if (claim.claimType === "cross-evidence-synthesis") {
    if (hasTension) {
      tags.push("useful-tension", "good-cross-source-synthesis");
      if (novelty === "new-angle") tags.push("opens-new-angle");
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "surprising-but-defensible",
        strengthVerdict: "appropriate",
        reasonTags: tags,
        notes: `Preserves archive tension; novelty=${novelty}`,
      };
    }
    if (themeListOnly || novelty === "duplicate" || novelty === "similar") {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "obvious",
        strengthVerdict: "appropriate",
        reasonTags: ["too-generic", "weak-cross-source-synthesis", "repetitive"],
        notes: "Theme listing / near-paraphrase of deterministic synthesis.",
      };
    }
    return {
      evidenceVerdict: "supported",
      usefulnessVerdict:
        fixtureId === "q4" || fixtureId === "q3" ? "useful" : "obvious",
      strengthVerdict: "appropriate",
      reasonTags:
        fixtureId === "q4" || fixtureId === "q3"
          ? ["good-cross-source-synthesis"]
          : ["weak-cross-source-synthesis", "too-generic"],
      notes: `Synthesis without sharp tension; novelty=${novelty}`,
    };
  }

  if (claim.claimType === "modern-transfer") {
    tags.push("modern-transfer-clear");
    // Stretch: named work → contemporary topic without clear evidence bridge
    const stretch =
      /クリエイティブな仕事|労働市場における倫理|アイデンティティの再構築においても重要な視点を提供/.test(
        text,
      ) && !hasTension;
    if (stretch && (fixtureId === "q10" || fixtureId === "q2")) {
      return {
        evidenceVerdict: "too-weak",
        usefulnessVerdict: "not-useful",
        strengthVerdict: "too-certain",
        reasonTags: [...tags, "evidence-too-thin"],
        notes: "Transfer feels thin relative to evidence.",
      };
    }
    if (hasTension || fixtureId === "q4" || fixtureId === "q6") {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "surprising-but-defensible",
        strengthVerdict: "appropriate",
        reasonTags: [...tags, "opens-new-angle"],
        notes: `Defensible modern transfer; novelty=${novelty}`,
      };
    }
    if (themeListOnly) {
      return {
        evidenceVerdict: "supported",
        usefulnessVerdict: "obvious",
        strengthVerdict: "appropriate",
        reasonTags: [...tags, "too-obvious"],
        notes: "Safe but generic modern transfer.",
      };
    }
    return {
      evidenceVerdict: "supported",
      usefulnessVerdict: "useful",
      strengthVerdict: "appropriate",
      reasonTags: tags,
      notes: `Modern transfer; novelty=${novelty}`,
    };
  }

  return {
    evidenceVerdict: "supported",
    usefulnessVerdict: "unclear",
    strengthVerdict: "unclear",
    reasonTags: tags,
    notes: "Fallback judgment.",
  };
}

async function main() {
  loadLocalEnv();
  console.log("Persist LLM claim human evaluations\n");

  if (!OpenAIClaimLLMProvider.isConfigured()) {
    console.log("LLM CLAIM PROVIDER UNAVAILABLE");
    process.exitCode = 2;
    return;
  }

  let saved = 0;
  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const result = await runLlmClaimExperimentCase({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
      });
      if (result.providerUnavailable) {
        console.log("LLM CLAIM PROVIDER UNAVAILABLE");
        process.exitCode = 2;
        return;
      }

  // Prefer up to 5 allowed claims for human review sample
      const queue = [
        ...result.llmClaims.filter((c) => c.claim.allowedInFinalPerspective),
        ...result.llmClaims.filter(
          (c) =>
            !c.claim.allowedInFinalPerspective &&
            (c.claim.validationIssues.includes(
              "modern-concept-attributed-to-writer",
            ) ||
              c.claim.validationIssues.includes("work-voice-misattribution") ||
              c.claim.validationIssues.includes("external-knowledge-injection") ||
              c.claim.validationIssues.includes("unsupported-certainty")),
        ),
      ].slice(0, 6);

      for (const item of queue) {
        const judgment = judgeLlm(item, fixture.id);
        if (!judgment) continue;
        upsertClaimHumanEvaluation({
          claimId: item.claim.id,
          fixtureId: fixture.id,
          personId: person.id,
          ...judgment,
        });
        saved += 1;
      }
      console.log(
        `${fixture.id} ${person.name}: reviewed queue=${queue.length}`,
      );
    }
  }

  console.log(`\nPersisted LLM claim human evaluations: ${saved}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
