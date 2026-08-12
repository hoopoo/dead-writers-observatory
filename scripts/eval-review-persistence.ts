import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeQuestion } from "../src/lib/question-analysis";
import { MockPerspectiveRetriever } from "../src/lib/retrieval";
import {
  closeReviewDb,
  openReviewDbAt,
} from "../src/lib/review/db";
import { resetReviewSeedFlag } from "../src/lib/review/active";
import { sqliteReviewRepository } from "../src/lib/review/sqlite-repository";
import { DEFAULT_REVIEW_ACTOR } from "../src/types/review";
import { loadBaselineSnapshot } from "../src/lib/retrieval-regression";

async function main() {
  console.log("Dead Writers Observatory — review persistence flows\n");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dwo-review-"));
  const dbPath = path.join(tmp, "reviews.sqlite");
  openReviewDbAt(dbPath);
  resetReviewSeedFlag();
  sqliteReviewRepository.seedFromStatic();

  const retriever = new MockPerspectiveRetriever();
  const question = "人からどう見られているかが気になります。";
  const analysis = analyzeQuestion(question);
  const passageId = "pass-dazai-ningen-01";

  const before = await retriever.retrieve("person-dazai", analysis);
  const selectedBefore = before.some((f) => f.passageId === passageId);
  console.log(`1. selected before reject: ${selectedBefore}`);
  if (!selectedBefore) {
    console.error("Expected ningen passage in initial retrieval");
    process.exit(1);
  }

  await sqliteReviewRepository.updatePassageReview(
    passageId,
    { reviewStatus: "rejected", notes: "integration reject" },
    DEFAULT_REVIEW_ACTOR,
  );
  const afterReject = await retriever.retrieve("person-dazai", analysis);
  const selectedAfterReject = afterReject.some((f) => f.passageId === passageId);
  console.log(`2. selected after reject: ${selectedAfterReject}`);
  if (selectedAfterReject) {
    console.error("Rejected passage still selected");
    process.exit(1);
  }

  const eventsAfterReject = await sqliteReviewRepository.getReviewEvents(
    "passage",
    passageId,
  );
  const hasRejected = eventsAfterReject.some((e) => e.action === "rejected");
  console.log(`3. reject event present: ${hasRejected}`);
  if (!hasRejected) process.exit(1);

  // restore to approved then needs-review
  await sqliteReviewRepository.updatePassageReview(
    passageId,
    {
      reviewStatus: "approved",
      notes: "restore",
      checks: {
        textVerified: true,
        locatorVerified: true,
        voiceVerified: true,
        authorialDistanceVerified: true,
        sourceRelationshipVerified: true,
        fragmentMeaningVerified: true,
      },
    },
    DEFAULT_REVIEW_ACTOR,
  );

  await sqliteReviewRepository.updatePassageReview(
    passageId,
    { reviewStatus: "needs-review", notes: "needs review flow" },
    DEFAULT_REVIEW_ACTOR,
  );
  const afterNeeds = await retriever.retrieve("person-dazai", analysis);
  const selectedAfterNeeds = afterNeeds.some((f) => f.passageId === passageId);
  console.log(`4. selected after needs-review: ${selectedAfterNeeds}`);
  if (selectedAfterNeeds) {
    console.error("needs-review passage still primary-selected");
    process.exit(1);
  }

  await sqliteReviewRepository.updatePassageReview(
    passageId,
    {
      reviewStatus: "approved",
      notes: "final restore",
      checks: {
        textVerified: true,
        locatorVerified: true,
        voiceVerified: true,
        authorialDistanceVerified: true,
        sourceRelationshipVerified: true,
        fragmentMeaningVerified: true,
      },
    },
    DEFAULT_REVIEW_ACTOR,
  );

  const events = await sqliteReviewRepository.getReviewEvents(
    "passage",
    passageId,
  );
  const actions = events.map((e) => e.action);
  console.log(`5. event actions (newest first): ${actions.join(" → ")}`);
  const hasCreated = actions.includes("created");
  const hasRejectedEvent = actions.includes("rejected");
  const hasRestoredOrApproved = actions.includes("restored") || actions.filter((a) => a === "approved").length >= 1;
  const hasNeeds = actions.includes("needs-review");
  if (!hasCreated || !hasRejectedEvent || !hasRestoredOrApproved || !hasNeeds) {
    console.error("Missing expected review history chain");
    process.exit(1);
  }

  // snapshot baseline must not auto-update
  const beforeSnap = loadBaselineSnapshot();
  const mtimeBefore = beforeSnap
    ? fs.statSync(
        path.join(process.cwd(), "src/data/retrieval-snapshots/v1.json"),
      ).mtimeMs
    : null;
  await retriever.retrieve("person-dazai", analysis);
  const mtimeAfter = beforeSnap
    ? fs.statSync(
        path.join(process.cwd(), "src/data/retrieval-snapshots/v1.json"),
      ).mtimeMs
    : null;
  console.log(
    `6. snapshot untouched by retrieval: ${mtimeBefore === mtimeAfter}`,
  );
  if (mtimeBefore !== null && mtimeBefore !== mtimeAfter) {
    console.error("Baseline snapshot was modified by retrieval");
    process.exit(1);
  }

  // restart persistence: reopen db
  closeReviewDb();
  openReviewDbAt(dbPath);
  resetReviewSeedFlag();
  const persisted = await sqliteReviewRepository.getPassageReview(passageId);
  console.log(`7. persisted after reopen: ${persisted?.reviewStatus}`);
  if (persisted?.reviewStatus !== "approved") {
    console.error("Review state did not survive reopen");
    process.exit(1);
  }

  console.log("\nALL REVIEW PERSISTENCE FLOWS PASSED");
  closeReviewDb();
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
