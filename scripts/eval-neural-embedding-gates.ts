/**
 * Structural gates for namespaced embeddings + human eval persistence.
 * Does not call external neural APIs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { closeReviewDb, openReviewDbAt } from "../src/lib/review/db";
import { resetReviewSeedFlag } from "../src/lib/review/active";
import { sqliteReviewRepository } from "../src/lib/review/sqlite-repository";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";
import { defaultSemanticIndex } from "../src/lib/embeddings/store";
import { hashEmbeddingContent } from "../src/lib/embeddings/content-hash";
import { buildPassageEmbeddingPayload } from "../src/lib/embeddings/payload";
import { LocalBridgeEmbeddingProvider } from "../src/lib/embeddings/providers/local-bridge";
import {
  getRetrievalHumanEvaluation,
  upsertRetrievalHumanEvaluation,
} from "../src/lib/retrieval-human-eval";
import { compareRetrievalEvaluationModes } from "../src/lib/retrieval-compare";
import { passages } from "../src/data/passages";
import type { EmbeddingProvider } from "../src/types/embedding";

class FakeNeuralProvider implements EmbeddingProvider {
  readonly providerName = "openai";
  readonly modelName = "fake-neural-test";
  readonly dimensions = 8;

  async embedText(text: string): Promise<number[]> {
    const [v] = await this.embedBatch([text]);
    return v;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const vec = new Array(8).fill(0);
      for (let i = 0; i < text.length; i += 1) {
        vec[i % 8] += (text.charCodeAt(i) % 7) + 1;
      }
      const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
      return vec.map((x) => x / norm);
    });
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export async function runNeuralEmbeddingGates(): Promise<void> {
  console.log("--- neural embedding / human-eval gates ---\n");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dwo-neural-"));
  const dbPath = path.join(tmp, "reviews.sqlite");
  openReviewDbAt(dbPath);
  resetReviewSeedFlag();
  sqliteReviewRepository.seedFromStatic();

  // 1) local index + idempotency
  const first = await indexPassageEmbeddings({
    provider: "local-bridge",
    requireNeural: false,
  });
  assert(first.embedded > 0, "expected first local embed > 0");
  const second = await indexPassageEmbeddings({
    provider: "local-bridge",
    requireNeural: false,
  });
  assert(second.alreadyCurrent === first.eligible, "idempotency alreadyCurrent");
  assert(second.embedded === 0, "idempotency embedded=0");
  console.log("1. local index idempotency: PASS");

  const localCount = defaultSemanticIndex.countByProvider(
    "local-bridge",
    "concept-bridge-v0.1",
  );
  assert(localCount === first.eligible, "local count matches eligible");

  // 2) fake neural coexist (same payload, different namespace)
  const fake = new FakeNeuralProvider();
  const sample = passages.filter((p) =>
    defaultSemanticIndex.get(p.id, "local-bridge", "concept-bridge-v0.1"),
  );
  assert(sample.length > 0, "need local rows");
  const neuralRecords = [];
  for (const passage of sample.slice(0, 5)) {
    const payload = buildPassageEmbeddingPayload(passage);
    const embedding = await fake.embedText(payload);
    neuralRecords.push({
      passageId: passage.id,
      sourceId: passage.sourceId,
      personId: passage.personId,
      embedding,
      provider: fake.providerName,
      model: fake.modelName,
      dimensions: embedding.length,
      contentHash: hashEmbeddingContent(payload),
      embeddedAt: new Date().toISOString(),
    });
  }
  await defaultSemanticIndex.upsert(neuralRecords);
  const afterLocal = defaultSemanticIndex.countByProvider(
    "local-bridge",
    "concept-bridge-v0.1",
  );
  const neuralCount = defaultSemanticIndex.countByProvider(
    "openai",
    "fake-neural-test",
  );
  assert(afterLocal === localCount, "local rows untouched by neural upsert");
  assert(neuralCount === neuralRecords.length, "neural rows stored");
  console.log("2. local/neural coexistence: PASS");

  // 3) wrong provider not reused in search
  const localProvider = new LocalBridgeEmbeddingProvider();
  const query = await localProvider.embedText("仕事 独立 不安");
  const localHits = await defaultSemanticIndex.search(query, {
    personId: sample[0].personId,
    topK: 5,
    provider: "local-bridge",
    model: "concept-bridge-v0.1",
  });
  const wrongHits = await defaultSemanticIndex.search(query, {
    personId: sample[0].personId,
    topK: 5,
    provider: "openai",
    model: "wrong-model",
  });
  assert(localHits.length > 0, "local search returns hits");
  assert(wrongHits.length === 0, "wrong provider/model must not reuse vectors");
  console.log("3. wrong provider not reused: PASS");

  // 4) contentHash mismatch reindex
  const target = sample[0];
  const payload = buildPassageEmbeddingPayload(target);
  const realHash = hashEmbeddingContent(payload);
  const existing = defaultSemanticIndex.get(
    target.id,
    "local-bridge",
    "concept-bridge-v0.1",
  )!;
  await defaultSemanticIndex.upsert([
    { ...existing, contentHash: "stale-hash-for-test" },
  ]);
  const reindex = await indexPassageEmbeddings({
    provider: "local-bridge",
    requireNeural: false,
  });
  assert(reindex.embedded >= 1, "hash mismatch triggers reindex");
  const restored = defaultSemanticIndex.get(
    target.id,
    "local-bridge",
    "concept-bridge-v0.1",
  )!;
  assert(restored.contentHash === realHash, "hash restored");
  console.log("4. contentHash mismatch reindex: PASS");

  // 5–6) human evaluation persistence + update
  const created = upsertRetrievalHumanEvaluation({
    fixtureId: "q4",
    personId: "person-soseki",
    candidateMode: "neural-hybrid",
    verdict: "same",
    reasonTags: ["better-context"],
    notes: "first",
  });
  assert(created.verdict === "same", "create verdict");
  const updated = upsertRetrievalHumanEvaluation({
    fixtureId: "q4",
    personId: "person-soseki",
    candidateMode: "neural-hybrid",
    verdict: "better",
    reasonTags: ["more-relevant", "better-modern-connection"],
    notes: "updated",
  });
  assert(updated.id === created.id, "update same row");
  assert(updated.verdict === "better", "verdict updated");
  assert(updated.notes === "updated", "notes updated");
  const loaded = getRetrievalHumanEvaluation({
    fixtureId: "q4",
    personId: "person-soseki",
    candidateMode: "neural-hybrid",
  });
  assert(loaded?.verdict === "better", "persisted load");
  console.log("5. human evaluation persistence: PASS");
  console.log("6. human evaluation update: PASS");

  // 7) retrieval comparison stable (deterministic)
  const a = await compareRetrievalEvaluationModes({
    question: "AIに自分の仕事を奪われる気がします。",
    personId: "person-soseki",
    modes: ["deterministic"],
  });
  const b = await compareRetrievalEvaluationModes({
    question: "AIに自分の仕事を奪われる気がします。",
    personId: "person-soseki",
    modes: ["deterministic"],
  });
  assert(
    a[0].selected.map((f) => f.id).join(",") ===
      b[0].selected.map((f) => f.id).join(","),
    "deterministic comparison stable",
  );
  console.log("7. retrieval comparison stable: PASS");

  // 8) blind mapping restore (left/right modes stored on save)
  const blind = upsertRetrievalHumanEvaluation({
    fixtureId: "q3",
    personId: "person-dazai",
    candidateMode: "local-semantic",
    verdict: "worse",
    reasonTags: ["too-associative"],
    blindLeftMode: "local-semantic",
    blindRightMode: "deterministic",
  });
  assert(blind.blindLeftMode === "local-semantic", "blind left restored");
  assert(blind.blindRightMode === "deterministic", "blind right restored");
  console.log("8. blind mode mapping: PASS");

  // 9) machine/human metrics remain separate (no composite score field)
  assert(typeof a[0].quality.total === "number", "machine quality numeric");
  assert(typeof loaded?.verdict === "string", "human verdict categorical");
  assert(
    !Object.prototype.hasOwnProperty.call(loaded ?? {}, "compositeScore"),
    "human eval must not carry compositeScore",
  );
  console.log("9. machine/human metrics separate: PASS");

  closeReviewDb();
  console.log("\nALL GATES PASS\n");
}

const isDirectRun = process.argv[1]?.includes("eval-neural-embedding-gates");
if (isDirectRun) {
  runNeuralEmbeddingGates().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
