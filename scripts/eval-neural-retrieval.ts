import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { compareRetrievalEvaluationModes } from "../src/lib/retrieval-compare";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";
import {
  NeuralProviderUnavailableError,
  OpenAIEmbeddingProvider,
} from "../src/lib/embeddings/providers/openai";
import { closeReviewDb } from "../src/lib/review/db";
import {
  getActivePassageReview,
  resetReviewSeedFlag,
} from "../src/lib/review/active";
import type { RetrievalEvaluationMode } from "../src/types/embedding";
import { runNeuralEmbeddingGates } from "./eval-neural-embedding-gates";

const SPECIAL = {
  sns: "SNSを見るのをやめたいのに、つい見てしまいます。",
  ai: "AIに自分の仕事を奪われる気がします。",
  success: "成功しているはずなのに幸福ではありません。",
  aging: "歳を取っていくことが怖いです。",
};

async function main() {
  console.log("Dead Writers Observatory — neural retrieval eval\n");

  await runNeuralEmbeddingGates();

  // Restore default review DB after gate temp DB.
  delete process.env.CURATOR_REVIEW_DB_PATH;
  closeReviewDb();
  resetReviewSeedFlag();

  await indexPassageEmbeddings({ provider: "local-bridge", requireNeural: false });

  const neuralConfigured = OpenAIEmbeddingProvider.isConfigured();
  if (neuralConfigured) {
    try {
      await indexPassageEmbeddings({ provider: "openai", requireNeural: true });
    } catch (error) {
      console.log("NEURAL PROVIDER UNAVAILABLE");
      if (error instanceof NeuralProviderUnavailableError) {
        console.log(error.message);
      }
    }
  } else {
    console.log("NEURAL PROVIDER UNAVAILABLE");
    console.log("(OPENAI_API_KEY / EMBEDDING_API_KEY not set — neural modes will error)\n");
  }

  const modes: RetrievalEvaluationMode[] = [
    "deterministic",
    "local-semantic",
    "neural-semantic",
    "neural-hybrid",
  ];

  const aggregates = Object.fromEntries(
    modes.map((mode) => [
      mode,
      {
        quality: 0,
        sourceDiversity: 0,
        distanceDiversity: 0,
        themeDiversity: 0,
        singleSource: 0,
        unapprovedSelected: 0,
        rejectedSelected: 0,
        highOverclaimSelected: 0,
        errors: 0,
        n: 0,
      },
    ]),
  ) as Record<
    RetrievalEvaluationMode,
    {
      quality: number;
      sourceDiversity: number;
      distanceDiversity: number;
      themeDiversity: number;
      singleSource: number;
      unapprovedSelected: number;
      rejectedSelected: number;
      highOverclaimSelected: number;
      errors: number;
      n: number;
    }
  >;

  let dazaiSingleSource = 0;
  let akutagawaDeathCollapse = 0;
  let sosekiIndivCollapse = 0;

  for (const fixture of FIXTURE_QUESTIONS) {
    console.log(`=== ${fixture.id}: ${fixture.label} ===`);
    for (const person of people) {
      const comparisons = await compareRetrievalEvaluationModes({
        question: fixture.question,
        personId: person.id,
        modes,
      });
      for (const result of comparisons) {
        const bucket = aggregates[result.mode as RetrievalEvaluationMode];
        if (result.error) {
          bucket.errors += 1;
          console.log(
            `  ${String(result.mode).padEnd(16)} ${person.name}: ${result.error}`,
          );
          continue;
        }
        bucket.quality += result.quality.total;
        bucket.sourceDiversity += result.sourceDiversity;
        bucket.distanceDiversity += result.distanceDiversity;
        bucket.themeDiversity += result.themeDiversity;
        bucket.singleSource += result.singleSourceDominance ? 1 : 0;
        bucket.n += 1;
        if (
          result.selected.some(
            (f) => getActivePassageReview(f.passageId)?.reviewStatus !== "approved",
          )
        ) {
          bucket.unapprovedSelected += 1;
        }
        if (
          result.selected.some(
            (f) => getActivePassageReview(f.passageId)?.reviewStatus === "rejected",
          )
        ) {
          bucket.rejectedSelected += 1;
        }

        const sources = new Set(result.selected.map((f) => f.sourceId));
        console.log(
          `  ${String(result.mode).padEnd(16)} ${person.name}: Q=${result.quality.total} src=${result.sourceDiversity} dist=${result.distanceDiversity} theme=${result.themeDiversity} single=${result.singleSourceDominance}`,
        );

        if (person.id === "person-dazai" && result.singleSourceDominance) {
          dazaiSingleSource += 1;
        }
        if (
          person.id === "person-akutagawa" &&
          fixture.id === "q10" &&
          result.mode !== "deterministic"
        ) {
          const onlyDeathWorks = [...sources].every(
            (id) => id.includes("haguruma") || id.includes("ahou"),
          );
          if (
            onlyDeathWorks &&
            sources.size <= 2 &&
            !sources.has("src-akutagawa-shuju")
          ) {
            akutagawaDeathCollapse += 1;
          }
        }
        if (
          person.id === "person-soseki" &&
          (fixture.id === "q1" || fixture.id === "q4") &&
          result.mode !== "deterministic"
        ) {
          if (sources.size === 1 && sources.has("src-soseki-individualism")) {
            sosekiIndivCollapse += 1;
          }
        }
      }
    }
    console.log("");
  }

  console.log("=== SPECIAL QUESTIONS ===");
  for (const [key, question] of Object.entries(SPECIAL)) {
    console.log(`\n[${key}] ${question}`);
    for (const person of people) {
      const comparisons = await compareRetrievalEvaluationModes({
        question,
        personId: person.id,
        modes,
      });
      for (const result of comparisons) {
        if (result.error) {
          console.log(
            `  ${String(result.mode).padEnd(16)} ${person.name}: ${result.error}`,
          );
          continue;
        }
        const titles = result.selected.map((f) =>
          f.sourceId.replace(/^src-[^-]+-/, ""),
        );
        console.log(
          `  ${String(result.mode).padEnd(16)} ${person.name}: ${titles.join(" / ")} (Q=${result.quality.total})`,
        );
      }
    }
  }

  console.log("\n=== MODE AGGREGATES (machine metrics only) ===");
  for (const mode of modes) {
    const bucket = aggregates[mode];
    const n = Math.max(1, bucket.n);
    console.log(
      [
        mode,
        `avgQuality=${bucket.n ? (bucket.quality / n).toFixed(1) : "n/a"}`,
        `avgSourceDiv=${bucket.n ? (bucket.sourceDiversity / n).toFixed(2) : "n/a"}`,
        `avgDistDiv=${bucket.n ? (bucket.distanceDiversity / n).toFixed(2) : "n/a"}`,
        `avgThemeDiv=${bucket.n ? (bucket.themeDiversity / n).toFixed(2) : "n/a"}`,
        `singleSource=${bucket.singleSource}`,
        `unapproved=${bucket.unapprovedSelected}`,
        `rejected=${bucket.rejectedSelected}`,
        `highOverclaim=${bucket.highOverclaimSelected}`,
        `errors=${bucket.errors}`,
      ].join(" · "),
    );
  }

  console.log("\n=== COLLAPSE CHECKS ===");
  console.log(`Dazai single-source domination events: ${dazaiSingleSource}`);
  console.log(`Akutagawa death-collapse events: ${akutagawaDeathCollapse}`);
  console.log(`Soseki individualism-collapse events: ${sosekiIndivCollapse}`);

  const neuralUnavailable =
    aggregates["neural-semantic"].errors > 0 ||
    aggregates["neural-hybrid"].errors > 0;
  if (neuralUnavailable) {
    console.log("\nNEURAL PROVIDER UNAVAILABLE (eval does not fake neural with local-bridge)");
  }

  const failed =
    dazaiSingleSource > 0 ||
    akutagawaDeathCollapse > 0 ||
    sosekiIndivCollapse > 0 ||
    aggregates["local-semantic"].unapprovedSelected > 0;

  console.log(failed ? "\nFAIL" : "\nPASS (machine structure)");
  console.log(
    "NOTE: Human verdicts are separate — run npm run eval:retrieval-human",
  );
  closeReviewDb();
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
