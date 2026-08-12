import { closeReviewDb } from "../src/lib/review/db";
import { pruneStaleEmbeddings } from "../src/lib/embeddings/index-passages";

async function main() {
  console.log("Dead Writers Observatory — embeddings prune\n");
  const report = await pruneStaleEmbeddings();
  console.log(`Removed: ${report.removed}`);
  console.log(`Kept: ${report.kept}`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
