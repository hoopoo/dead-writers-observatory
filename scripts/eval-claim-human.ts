import fs from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { generateClaimsForQuestion } from "../src/lib/claims";
import {
  exportClaimHumanEvaluationsJson,
  listClaimHumanEvaluations,
} from "../src/lib/claims/human-eval";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { summarizeClaimHumanEvaluations } from "../src/lib/claims/human-summary";
import { machineHumanDisagreement } from "../src/lib/claims/human-summary";
import { closeReviewDb } from "../src/lib/review/db";
import type { PerspectiveClaim } from "../src/types/perspective-claim";

async function main() {
  console.log("Dead Writers Observatory — claim human evaluation summary\n");

  const evaluations = listClaimHumanEvaluations();
  const claimsById = new Map<string, PerspectiveClaim>();

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId);
    if (!fixture) continue;
    for (const person of people) {
      const result = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
      });
      for (const claim of result.claims) claimsById.set(claim.id, claim);
    }
  }

  const summary = summarizeClaimHumanEvaluations({ evaluations, claimsById });
  const target = 100;

  console.log(`Reviewed:\n${summary.reviewed}`);
  console.log(`\nGrounding Rate:\n${summary.groundingRate.toFixed(0)}%`);
  console.log(`\nOverstatement:\n${summary.overstatementRate.toFixed(0)}%`);
  console.log(`\nMisattribution:\n${summary.misattributionRate.toFixed(0)}%`);
  console.log(`\nUsefulness:\n${summary.usefulnessRate.toFixed(0)}%`);
  console.log(
    `\nSurprising but Defensible:\n${summary.surprisingRate.toFixed(0)}%`,
  );
  console.log(`\nObvious:\n${summary.obviousRate.toFixed(0)}%`);
  console.log(`\nNot Useful:\n${summary.notUsefulRate.toFixed(0)}%`);

  console.log("\n=== STRENGTH ===");
  console.log(`Appropriate: ${summary.strengthAppropriate}`);
  console.log(`Too cautious: ${summary.strengthTooCautious}`);
  console.log(`Too certain: ${summary.strengthTooCertain}`);

  console.log("\n=== BY CLAIM TYPE ===");
  for (const [type, bucket] of Object.entries(summary.byType)) {
    const n = Math.max(1, bucket.reviewed);
    console.log(
      `${type}: useful ${((bucket.useful / n) * 100).toFixed(0)}% · surprising ${((bucket.surprising / n) * 100).toFixed(0)}% · obvious ${((bucket.obvious / n) * 100).toFixed(0)}% · not-useful ${((bucket.notUseful / n) * 100).toFixed(0)}% (n=${bucket.reviewed})`,
    );
  }

  console.log("\n=== MACHINE / HUMAN DISAGREEMENT ===");
  let disagreements = 0;
  for (const evaluation of evaluations) {
    const claim = claimsById.get(evaluation.claimId);
    if (!claim) continue;
    const label = machineHumanDisagreement({ claim, evaluation });
    if (label) {
      disagreements += 1;
      console.log(
        `${evaluation.fixtureId} / ${evaluation.personId} / ${claim.claimType}: ${label}`,
      );
    }
  }
  if (disagreements === 0) console.log("(none)");

  const exportDir = path.join(process.cwd(), "data", "evaluations");
  fs.mkdirSync(exportDir, { recursive: true });
  const exportPath = path.join(exportDir, "claim-human-v1.json");
  fs.writeFileSync(
    exportPath,
    JSON.stringify(exportClaimHumanEvaluationsJson(), null, 2),
  );
  console.log(`\nExported: ${exportPath}`);
  console.log(
    summary.reviewed >= target
      ? `\nPriority target met (>= ${target}).`
      : `\nPriority target short: ${summary.reviewed} / ${target}`,
  );

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
