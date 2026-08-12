import { closeReviewDb, getReviewDbPath } from "../src/lib/review/db";
import { sqliteReviewRepository } from "../src/lib/review/sqlite-repository";

function main() {
  const path = getReviewDbPath();
  const first = sqliteReviewRepository.seedFromStatic();
  const second = sqliteReviewRepository.seedFromStatic();
  console.log("Dead Writers Observatory — curator seed\n");
  console.log(`DB: ${path}`);
  console.log(
    `First run: passages=${first.passages} fragments=${first.fragments} events=${first.events}`,
  );
  console.log(
    `Second run (idempotent): passages=${second.passages} fragments=${second.fragments} events=${second.events}`,
  );
  if (second.passages !== 0 || second.events !== 0) {
    console.error("Seed is not idempotent");
    process.exit(1);
  }
  console.log("OK");
  closeReviewDb();
}

main();
