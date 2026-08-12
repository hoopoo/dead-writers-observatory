import { closeReviewDb } from "../src/lib/review/db";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";

async function main() {
  console.log("Dead Writers Observatory — embeddings index\n");
  const report = await indexPassageEmbeddings();
  console.log(`Provider: ${report.provider}${report.model ? ` / ${report.model}` : ""}`);
  console.log(`Eligible passages: ${report.eligible}`);
  console.log(`Already current: ${report.alreadyCurrent}`);
  console.log(`Embedded: ${report.embedded}`);
  console.log(`Skipped unapproved: ${report.skippedUnapproved}`);
  console.log(`Skipped unverified: ${report.skippedUnverified}`);
  console.log(`Skipped no text: ${report.skippedNoText}`);
  console.log(`Skipped no fragment: ${report.skippedNoFragment}`);
  console.log(`Skipped high overclaim: ${report.skippedHighOverclaim}`);
  console.log(`Errors: ${report.errors}`);
  closeReviewDb();
  if (report.errors > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
