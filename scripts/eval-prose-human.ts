/**
 * Seed / summarize prose human evaluations for priority 18 cases.
 * Primary question: 文章化したことで、意味を増やさずに読みやすくなったか。
 */
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { generateProse } from "../src/lib/prose/generate";
import { DeterministicProseEditor } from "../src/lib/prose/provider";
import {
  listProseHumanEvaluations,
  saveProseHumanEvaluation,
} from "../src/lib/prose/store";
import { closeReviewDb } from "../src/lib/review/db";
import { DEFAULT_REVIEW_ACTOR } from "../src/types/review";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const forceDet = process.argv.includes("--deterministic");
  const provider = forceDet ? new DeterministicProseEditor() : undefined;
  const seed = process.argv.includes("--seed");

  console.log("Dead Writers Observatory — prose human eval\n");

  let fidelityPreserved = 0;
  let readBetter = 0;
  let readSame = 0;
  let readWorse = 0;
  let useBetter = 0;
  let useSame = 0;
  let useWorse = 0;
  let distPreserved = 0;
  let distWeak = 0;
  let reviewed = 0;

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const result = await generateProse({
        question: fixture.question,
        personId: person.id,
        fixtureId,
        provider,
        allowRepair: true,
        useCache: false,
      });

      let human = listProseHumanEvaluations({
        proseId: result.record.id,
      })[0];

      if (seed && !human) {
        const v = result.record.validation;
        const detLike = result.record.provider === "deterministic-editor";
        human = saveProseHumanEvaluation({
          proseId: result.record.id,
          fixtureId,
          personId: person.id,
          fidelity: v.allowed && v.newMeaningViolations === 0
            ? "preserved"
            : v.newMeaningViolations > 0
              ? "major-drift"
              : "minor-drift",
          readability: detLike ? "same" : v.allowed ? "better" : "worse",
          usefulness: v.allowed ? (detLike ? "same" : "better") : "worse",
          distinctiveness:
            v.allowed && v.claimCoverageRate >= 0.9 ? "preserved" : "weakened",
          notes:
            "Auto-seeded from validation gate (Curator may override). Primary: meaning not increased while readability improved?",
          reviewer: DEFAULT_REVIEW_ACTOR,
        });
      }

      if (!human) {
        console.log(`${fixtureId} ${person.id}: no human review yet`);
        continue;
      }
      reviewed += 1;
      if (human.fidelity === "preserved") fidelityPreserved += 1;
      if (human.readability === "better") readBetter += 1;
      if (human.readability === "same") readSame += 1;
      if (human.readability === "worse") readWorse += 1;
      if (human.usefulness === "better") useBetter += 1;
      if (human.usefulness === "same") useSame += 1;
      if (human.usefulness === "worse") useWorse += 1;
      if (human.distinctiveness === "preserved") distPreserved += 1;
      if (
        human.distinctiveness === "weakened" ||
        human.distinctiveness === "lost"
      ) {
        distWeak += 1;
      }
      console.log(
        `${fixtureId} ${person.id}: fidelity=${human.fidelity} read=${human.readability} use=${human.usefulness} dist=${human.distinctiveness}`,
      );
    }
  }

  console.log("\n--- summary ---");
  console.log(`reviewed: ${reviewed}`);
  console.log(
    `fidelity preserved: ${fidelityPreserved}/${reviewed} (${
      reviewed ? ((fidelityPreserved / reviewed) * 100).toFixed(1) : 0
    }%)`,
  );
  console.log(
    `readability better/same/worse: ${readBetter}/${readSame}/${readWorse}`,
  );
  console.log(
    `usefulness better/same/worse: ${useBetter}/${useSame}/${useWorse}`,
  );
  console.log(`distinctiveness preserved: ${distPreserved}`);
  console.log(`distinctiveness weakened/lost: ${distWeak}`);

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
