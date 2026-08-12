import {
  buildRetrievalSnapshotBundle,
} from "../src/lib/retrieval-snapshot";
import {
  BASELINE_SNAPSHOT_PATH,
  writeBaselineSnapshot,
} from "../src/lib/retrieval-regression";
import { closeReviewDb } from "../src/lib/review/db";

async function main() {
  const bundle = await buildRetrievalSnapshotBundle();
  writeBaselineSnapshot(bundle);
  console.log("Wrote retrieval baseline snapshot");
  console.log(BASELINE_SNAPSHOT_PATH);
  console.log(`Fixtures: ${bundle.fixtures.length}`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
