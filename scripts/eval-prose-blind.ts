/**
 * Independent prose blind-check gate (does not auto-seed fake humans).
 */
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { people } from "../src/data/people";
import { blindAssignmentFor } from "../src/lib/prose/blind";
import { decideBlindGate, decidePublicMode } from "../src/lib/release/decision";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — independent prose blind check\n");

  const assignment = blindAssignmentFor("q4", "person-soseki");
  assert(assignment.a !== assignment.b, "A/B differ");
  assert(
    (assignment.a === "skeleton" || assignment.a === "prose") &&
      (assignment.b === "skeleton" || assignment.b === "prose"),
    "assignment is skeleton vs prose",
  );
  console.log("1. A/B sides are distinct: PASS");

  const expected = PRIORITY_CLAIM_FIXTURES.length * people.length;
  const gate = decideBlindGate();
  const mode = decidePublicMode();

  console.log("\n--- PROSE RELEASE DECISION ---");
  console.log(`reviewed: ${gate.reviewed} / ${expected}`);
  console.log(`material meaning: ${gate.materialMeaning}`);
  console.log(`attribution unsafe: ${gate.attributionUnsafe}`);
  console.log(`prose preferred: ${gate.prosePreferred}`);
  console.log(`skeleton preferred: ${gate.skeletonPreferred}`);
  console.log(`same: ${gate.same}`);
  console.log(
    `readability better/same/worse: ${gate.readabilityBetter}/${gate.readabilitySame}/${gate.readabilityWorse}`,
  );
  console.log(
    `usefulness better/same/worse: ${gate.usefulnessBetter}/${gate.usefulnessSame}/${gate.usefulnessWorse}`,
  );
  console.log(`decision: ${gate.decision}`);
  console.log(`recommended mode: ${mode.recommendedMode}`);
  console.log(`reason: ${mode.reason}`);
  console.log(
    `\nPublic Beta can ship with ${mode.recommendedMode} (fallback always skeleton).`,
  );

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
