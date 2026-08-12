/**
 * Write perspective-sets-v1.json snapshot (manual command — not auto-updated).
 */
import fs from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import {
  PRIORITY_CLAIM_FIXTURES,
  buildPerspectiveSkeleton,
  buildStagingPerspectiveSkeleton,
} from "../src/lib/claims/approved";
import { generateClaimsForQuestion } from "../src/lib/claims";
import { listProposedClaims } from "../src/lib/claims/llm/store";
import { buildWriterFingerprint } from "../src/lib/claims/distinctiveness";
import { closeReviewDb } from "../src/lib/review/db";
import type { PerspectiveSetSnapshotBundle } from "../src/types/perspective-claim";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  const experiment = process.argv.includes("--A") ? "A" : "B";
  const cases: PerspectiveSetSnapshotBundle["cases"] = [];

  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const det = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        fixtureId,
        retrievalMode: "deterministic",
      });
      const skeleton =
        experiment === "A"
          ? buildPerspectiveSkeleton({
              personId: person.id,
              question: fixture.question,
              claims: det.claims,
            })
          : buildStagingPerspectiveSkeleton({
              personId: person.id,
              question: fixture.question,
              deterministicClaims: det.claims,
              llmClaims: listProposedClaims({
                fixtureId,
                personId: person.id,
              }).map((i) => i.claim),
            });
      const fingerprint = buildWriterFingerprint(person.id, skeleton.claims);
      cases.push({
        fixtureId,
        personId: person.id,
        claimIds: skeleton.claimIds,
        claimOrigins: skeleton.claims.map((c) =>
          c.generatorOrigin === "llm" ? "llm" : "deterministic",
        ),
        claimTypes: skeleton.claims.map((c) => c.claimType),
        availability: skeleton.availability,
        dominantThemes: fingerprint.dominantThemes,
      });
    }
  }

  const bundle: PerspectiveSetSnapshotBundle = {
    version: "perspective-sets-v1",
    generatedAt: new Date().toISOString(),
    experiment,
    cases,
  };

  const out = path.join(
    process.cwd(),
    "src/data/generation-snapshots/perspective-sets-v1.json",
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Wrote ${out} experiment=${experiment} cases=${cases.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
