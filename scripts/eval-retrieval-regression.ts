import { people } from "../src/data/people";
import {
  evaluateSnapshotInvariants,
  runRetrievalRegression,
} from "../src/lib/retrieval-regression";
import { closeReviewDb } from "../src/lib/review/db";

async function main() {
  console.log("Dead Writers Observatory — retrieval regression\n");
  const { current, failures, summary } = await runRetrievalRegression();

  for (const fixture of current.fixtures) {
    const fixtureFails = evaluateSnapshotInvariants(fixture);
    const pass = fixtureFails.length === 0;
    console.log(
      `Fixture ${fixture.fixtureId} — ${pass ? "PASS" : "FAIL"}`,
    );
    for (const writer of fixture.writers) {
      const person = people.find((p) => p.id === writer.personId);
      console.log(
        `  ${person?.name ?? writer.personId}: sources=${writer.sourceDiversity} distanceDiversity=${writer.diversity.distanceDiversity} approvedIntegrity=${writer.quality.reviewIntegrity} singleSource=${writer.diversity.singleSourceDominance}`,
      );
    }
    console.log(
      `  Perspective diversity: ${
        fixture.writers.every((w) => !w.diversity.singleSourceDominance)
          ? "PASS"
          : "FAIL"
      }\n`,
    );
  }

  console.log(
    `${summary.fixturesPass} / ${summary.fixturesTotal} fixtures PASS`,
  );
  console.log(`Single-source domination: ${summary.singleSource}`);
  console.log(`Unapproved evidence: ${summary.unapproved}`);
  console.log(`Rejected evidence: ${summary.rejected}`);
  console.log(`Needs-review evidence: ${summary.needsReview}`);
  console.log(`High-overclaim evidence: ${summary.highOverclaim}`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(
        `- ${failure.fixtureId} ${failure.personId} ${failure.code}: ${failure.detail}`,
      );
    }
    closeReviewDb();
    process.exit(1);
  }

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
