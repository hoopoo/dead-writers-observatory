/**
 * Snapshot Experiment C perspective sets (does not overwrite B snapshot).
 */
import fs from "node:fs";
import path from "node:path";
import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "../src/lib/claims/approved";
import { buildExperimentClaimPool } from "../src/lib/claims/experiment-c/build";
import { buildWriterFingerprint } from "../src/lib/claims/distinctiveness";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";
import { closeReviewDb } from "../src/lib/review/db";
import { OpenAIClaimLLMProvider } from "../src/lib/claims/llm/provider";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();
  if (!OpenAIClaimLLMProvider.isConfigured()) {
    console.log("LLM CLAIM PROVIDER UNAVAILABLE");
    process.exitCode = 2;
    return;
  }
  await indexPassageEmbeddings({ provider: "openai", requireNeural: true });

  const cases = [];
  for (const fixtureId of PRIORITY_CLAIM_FIXTURES) {
    const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId)!;
    for (const person of people) {
      const built = await buildExperimentClaimPool({
        experimentId: "C",
        question: fixture.question,
        personId: person.id,
        fixtureId,
      });
      const fingerprint = buildWriterFingerprint(
        person.id,
        built.skeleton.claims,
      );
      cases.push({
        fixtureId,
        personId: person.id,
        evidencePacketHash: built.pool.evidencePacketHash,
        claimIds: built.skeleton.claimIds,
        claimOrigins: built.skeleton.claims.map((c) =>
          c.generatorOrigin === "llm" ? "llm" : "deterministic",
        ),
        claimTypes: built.skeleton.claims.map((c) => c.claimType),
        availability: built.skeleton.availability,
        dominantThemes: fingerprint.dominantThemes,
        sourceIds: built.pool.packet.evidence.map((e) => e.sourceId),
      });
    }
  }

  const bundle = {
    version: "perspective-sets-c-v1",
    generatedAt: new Date().toISOString(),
    experiment: "C",
    retrievalMode: "neural-hybrid",
    cases,
  };

  const out = path.join(
    process.cwd(),
    "src/data/generation-snapshots/perspective-sets-c-v1.json",
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Wrote ${out} cases=${cases.length}`);

  // Ensure B snapshot still exists and was not overwritten
  const bPath = path.join(
    process.cwd(),
    "src/data/generation-snapshots/perspective-sets-v1.json",
  );
  if (fs.existsSync(bPath)) {
    const b = JSON.parse(fs.readFileSync(bPath, "utf8")) as { experiment?: string };
    console.log(`B snapshot intact: experiment=${b.experiment ?? "B"}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    closeReviewDb();
  });
