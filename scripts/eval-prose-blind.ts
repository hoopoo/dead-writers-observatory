/**
 * Independent prose blind-check gate (does not auto-seed fake humans).
 */
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { people } from "../src/data/people";
import {
  blindAssignmentFor,
  listIndependentProseBlindEvaluations,
  summarizeBlindGate,
} from "../src/lib/prose/blind";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — independent prose blind check\n");

  const assignmentHidden = blindAssignmentFor("q4", "person-soseki");
  assert(
    (assignmentHidden.a === "skeleton" && assignmentHidden.b === "prose") ||
      (assignmentHidden.a === "prose" && assignmentHidden.b === "skeleton"),
    "assignment is skeleton vs prose",
  );
  assert(assignmentHidden.a !== assignmentHidden.b, "A/B differ");
  console.log("1. A/B assignment hidden identity: PASS");

  const all = listIndependentProseBlindEvaluations();
  const latestByCase = new Map<string, (typeof all)[number]>();
  for (const row of all) {
    const key = `${row.fixtureId}:${row.personId}`;
    if (!latestByCase.has(key)) latestByCase.set(key, row);
  }

  let expected = 0;
  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    for (const person of people) {
      expected += 1;
      const row = latestByCase.get(`${fixtureId}:${person.id}`);
      console.log(
        `${fixtureId} ${person.id}: ${row ? row.preferred : "PENDING"}`,
      );
    }
  }

  const gate = summarizeBlindGate(Array.from(latestByCase.values()));
  console.log("\n--- gate ---");
  console.log(`reviewed: ${gate.reviewed} / ${expected}`);
  console.log(`material meaning: ${gate.materialMeaning}`);
  console.log(`attribution unsafe: ${gate.attributionUnsafe}`);
  console.log(
    `prose readability better+same: ${gate.proseReadabilityBetterOrSame}/${gate.reviewed}`,
  );
  console.log(
    `prose usefulness better+same: ${gate.proseUsefulnessBetterOrSame}/${gate.reviewed}`,
  );
  console.log(
    `gate: ${gate.gatePass === null ? "PENDING" : gate.gatePass ? "PASS" : "FAIL"}`,
  );

  if (gate.materialMeaning > 0 || gate.attributionUnsafe > 0) {
    throw new Error("Independent blind check failed safety/meaning gate");
  }

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
