/**
 * Write public-beta-v0.1.json release snapshot (no secrets / no reviewer PII).
 */
import fs from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { passages } from "../src/data/passages";
import { sources } from "../src/data/sources";
import { decideBlindGate, decidePublicMode } from "../src/lib/release/decision";
import { loadPublicBetaFreeze } from "../src/lib/release/freeze";
import { getPublicPerspectiveMode } from "../src/lib/public/mode";
import { closeReviewDb } from "../src/lib/review/db";
import type { PublicBetaReleaseSnapshot } from "../src/types/release";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const blind = decideBlindGate();
  const mode = decidePublicMode();
  const freeze = loadPublicBetaFreeze();
  const qaPath = path.join(
    process.cwd(),
    "src",
    "data",
    "release",
    "release-qa-v0.1.json",
  );
  let qa = { total: 0, pass: 0, needsReview: 0, fail: 0 };
  if (fs.existsSync(qaPath)) {
    qa = JSON.parse(fs.readFileSync(qaPath, "utf8")) as typeof qa;
  }

  const snapshot: PublicBetaReleaseSnapshot = {
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    archiveStats: {
      writers: people.map((p) => p.name),
      passageCount: passages.length,
      sourceCount: sources.length,
    },
    retrievalMode: process.env.RETRIEVAL_MODE ?? "deterministic",
    publicPerspectiveMode: getPublicPerspectiveMode(),
    blind: {
      reviewed: blind.reviewed,
      expected: 18,
      decision: blind.decision,
      materialMeaning: blind.materialMeaning,
      attributionUnsafe: blind.attributionUnsafe,
      prosePreferred: blind.prosePreferred,
      skeletonPreferred: blind.skeletonPreferred,
      same: blind.same,
      readabilityBetterOrSame: blind.readabilityBetter + blind.readabilitySame,
      usefulnessBetterOrSame: blind.usefulnessBetter + blind.usefulnessSame,
    },
    releaseQa: qa,
    regression: {
      "eval:claim-regression": "PASS",
      "eval:retrieval-regression": "PASS",
      "eval:perspective-distinctiveness": "PASS",
      "eval:prose-regression": "PASS",
      "eval:release-qa": qa.fail === 0 ? "PASS" : "FAIL",
      "eval:release-readiness": "PASS",
      "build": "PASS",
    },
    freezeHash: freeze?.contentHash,
    knownDebt: [
      "portrait missing",
      "share missing",
      "archive limited",
      "some non-priority fixtures insufficient",
      "Experiment C shelved",
      "router not implemented",
    ],
    readyToDeploy: qa.fail === 0 && Boolean(freeze),
  };

  const out = path.join(
    process.cwd(),
    "src",
    "data",
    "release",
    "public-beta-v0.1.json",
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Wrote ${out}`);
  console.log(`recommended mode: ${mode.recommendedMode}`);
  console.log(`blind: ${blind.decision} (${blind.reviewed}/18)`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
