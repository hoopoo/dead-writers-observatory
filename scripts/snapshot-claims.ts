import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { generateClaimsForQuestion } from "../src/lib/claims";
import { writeClaimsSnapshot } from "../src/lib/claims/snapshot";
import { closeReviewDb } from "../src/lib/review/db";
import type { ClaimSnapshotBundle } from "../src/types/perspective-claim";

async function main() {
  const cases: ClaimSnapshotBundle["cases"] = [];
  for (const fixture of FIXTURE_QUESTIONS) {
    for (const person of people) {
      const result = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        retrievalMode: "deterministic",
      });
      cases.push({
        fixtureId: fixture.id,
        personId: person.id,
        claimIds: result.claims.map((c) => c.id),
        claimTexts: result.claims.map((c) => c.text),
        claimTypes: result.claims.map((c) => c.claimType),
        supportStatuses: result.claims.map((c) => c.supportStatus),
        allowedFlags: result.claims.map((c) => c.allowedInFinalPerspective),
        validationIssues: result.claims.map((c) => c.validationIssues),
      });
    }
  }

  const bundle: ClaimSnapshotBundle = {
    version: "claims-v1",
    generatedAt: new Date().toISOString(),
    generationMode: "deterministic-claims",
    cases,
  };
  writeClaimsSnapshot(bundle);
  console.log("Wrote claim snapshot");
  console.log(`Cases: ${cases.length}`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
