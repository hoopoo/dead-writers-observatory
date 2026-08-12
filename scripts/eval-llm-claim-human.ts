/**
 * Human evaluation summary for LLM claim proposals (vs deterministic baseline).
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { listClaimHumanEvaluations } from "../src/lib/claims/human-eval";
import { summarizeClaimHumanEvaluations } from "../src/lib/claims/human-summary";
import { listProposedClaims } from "../src/lib/claims/llm/store";
import { closeReviewDb } from "../src/lib/review/db";
import { OpenAIClaimLLMProvider } from "../src/lib/claims/llm/provider";
import { loadLocalEnv } from "./load-env";
import type { PerspectiveClaim } from "../src/types/perspective-claim";

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — LLM claim human eval\n");

  if (!OpenAIClaimLLMProvider.isConfigured()) {
    console.log("LLM CLAIM PROVIDER UNAVAILABLE");
    console.log("(Machine metrics for LLM proposals require prior generation.)\n");
  }

  const llmClaims = listProposedClaims();
  const llmById = new Map(llmClaims.map((c) => [c.claim.id, c]));
  const llmClaimIds = new Set(llmById.keys());

  const allEvals = listClaimHumanEvaluations();
  const llmEvals = allEvals.filter((e) => llmClaimIds.has(e.claimId));

  const claimsById = new Map<string, PerspectiveClaim>();
  for (const item of llmClaims) {
    claimsById.set(item.claim.id, item.claim);
  }

  const summary = summarizeClaimHumanEvaluations({
    evaluations: llmEvals,
    claimsById,
  });

  const reviewed = llmEvals.length;
  const pct = (n: number) =>
    reviewed === 0 ? "0%" : `${Math.round((n / reviewed) * 100)}%`;

  const grounding = llmEvals.filter((e) => e.evidenceVerdict === "supported")
    .length;
  const tooStrong = llmEvals.filter((e) => e.evidenceVerdict === "too-strong")
    .length;
  const misattr = llmEvals.filter((e) => e.evidenceVerdict === "misattributed")
    .length;
  const useful = llmEvals.filter(
    (e) =>
      e.usefulnessVerdict === "useful" ||
      e.usefulnessVerdict === "surprising-but-defensible",
  ).length;
  const surprising = llmEvals.filter(
    (e) => e.usefulnessVerdict === "surprising-but-defensible",
  ).length;
  const obvious = llmEvals.filter((e) => e.usefulnessVerdict === "obvious")
    .length;
  const notUseful = llmEvals.filter((e) => e.usefulnessVerdict === "not-useful")
    .length;

  const newAngleApproved = llmEvals.filter((e) => {
    const item = llmById.get(e.claimId);
    if (!item) return false;
    if (item.novelty?.novelty !== "new-angle") return false;
    return (
      e.evidenceVerdict === "supported" &&
      (e.usefulnessVerdict === "useful" ||
        e.usefulnessVerdict === "surprising-but-defensible")
    );
  }).length;

  const llmOnlyApproved = llmEvals.filter((e) => {
    const item = llmById.get(e.claimId);
    if (!item?.claim.allowedInFinalPerspective) return false;
    if (item.novelty?.novelty !== "new-angle") return false;
    return (
      e.evidenceVerdict === "supported" &&
      (e.usefulnessVerdict === "useful" ||
        e.usefulnessVerdict === "surprising-but-defensible")
    );
  }).length;

  console.log(`Reviewed:\n${reviewed}`);
  console.log(`Grounding:\n${pct(grounding)}`);
  console.log(`Useful:\n${pct(useful)}`);
  console.log(`Surprising:\n${pct(surprising)}`);
  console.log(`Obvious:\n${pct(obvious)}`);
  console.log(`Not useful:\n${pct(notUseful)}`);
  console.log(`Too strong:\n${pct(tooStrong)}`);
  console.log(`Misattribution:\n${pct(misattr)}`);
  console.log(`New-angle:\n${pct(newAngleApproved)}`);
  console.log(`\nLLM-ONLY APPROVED CLAIMS (new-angle + useful/surprising):\n${llmOnlyApproved}`);

  console.log("\n--- By claim type ---");
  for (const [type, row] of Object.entries(summary.byType)) {
    console.log(
      `${type}: reviewed=${row.reviewed} useful=${row.useful} surprising=${row.surprising} obvious=${row.obvious}`,
    );
  }

  console.log("\n--- Priority case coverage ---");
  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const n = llmEvals.filter(
        (e) => e.fixtureId === fixtureId && e.personId === person.id,
      ).length;
      console.log(`${fixture.label} / ${person.name}: ${n}`);
    }
  }

  // Gate classification
  const groundingRate = reviewed ? grounding / reviewed : 0;
  const usefulRate = reviewed ? useful / reviewed : 0;
  const surprisingRate = reviewed ? surprising / reviewed : 0;
  const tooStrongRate = reviewed ? tooStrong / reviewed : 0;
  const misRate = reviewed ? misattr / reviewed : 0;

  let gate: "A" | "B" | "C" | "D" = "B";
  if (misRate > 0 || groundingRate < 0.9) gate = "D";
  else if (tooStrongRate >= 0.1 && surprisingRate >= 0.2) gate = "C";
  else if (
    groundingRate >= 0.95 &&
    usefulRate >= 0.7 &&
    surprisingRate >= 0.2 &&
    misRate === 0 &&
    llmOnlyApproved >= 5
  ) {
    gate = "A";
  } else if (groundingRate >= 0.95 && usefulRate < 0.7) {
    gate = "B";
  } else if (surprisingRate >= 0.2 && tooStrongRate >= 0.1) {
    gate = "C";
  }

  console.log(`\nClassification:\n${gate}`);
  console.log(
    gate === "A"
      ? "CLEAR VALUE — staging skeleton candidate possible after curation (not auto-wired to /observe yet)"
      : gate === "B"
        ? "SAFE BUT LITTLE VALUE — keep deterministic for skeleton"
        : gate === "C"
          ? "INTERESTING BUT RISKY — improve prompt/validator"
          : "REGRESSION — do not adopt LLM claims",
  );
  console.log(
    "\nNote: Human verdicts in this script sample are curator-heuristic judgments on the same axes; live curator review remains authoritative.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
