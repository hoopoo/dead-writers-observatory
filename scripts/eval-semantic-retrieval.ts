import { people } from "../src/data/people";
import { FIXTURE_QUESTIONS } from "../src/data/fixtures/questions";
import { compareRetrievalModes } from "../src/lib/retrieval-compare";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";
import { getActivePassageReview } from "../src/lib/review/active";
import { closeReviewDb } from "../src/lib/review/db";
import type { RetrievalMode } from "../src/types/embedding";

const SPECIAL = {
  sns: "SNSを見るのをやめたいのに、つい見てしまいます。",
  ai: "AIに自分の仕事を奪われる気がします。",
  success: "成功しているはずなのに幸福ではありません。",
  aging: "歳を取っていくことが怖いです。",
};

async function main() {
  console.log("Dead Writers Observatory — semantic retrieval eval\n");
  await indexPassageEmbeddings();

  const modes: RetrievalMode[] = ["deterministic", "semantic", "hybrid"];
  const aggregates = Object.fromEntries(
    modes.map((mode) => [
      mode,
      {
        quality: 0,
        sourceDiversity: 0,
        distanceDiversity: 0,
        singleSource: 0,
        trustRejects: 0,
        highOverclaimSelected: 0,
        unapprovedSelected: 0,
        n: 0,
      },
    ]),
  ) as Record<
    RetrievalMode,
    {
      quality: number;
      sourceDiversity: number;
      distanceDiversity: number;
      singleSource: number;
      trustRejects: number;
      highOverclaimSelected: number;
      unapprovedSelected: number;
      n: number;
    }
  >;

  let dazaiSingleSource = 0;
  let akutagawaDeathCollapse = 0;
  let sosekiIndivCollapse = 0;

  for (const fixture of FIXTURE_QUESTIONS) {
    console.log(`=== ${fixture.id}: ${fixture.label} ===`);
    for (const person of people) {
      const comparisons = await compareRetrievalModes({
        question: fixture.question,
        personId: person.id,
        modes,
      });
      for (const result of comparisons) {
        const bucket = aggregates[result.mode];
        bucket.quality += result.quality.total;
        bucket.sourceDiversity += result.sourceDiversity;
        bucket.distanceDiversity += result.distanceDiversity;
        bucket.singleSource += result.singleSourceDominance ? 1 : 0;
        bucket.trustRejects +=
          result.warnings.includes("SEMANTIC HIGH / TRUST LOW") ? 1 : 0;
        bucket.n += 1;
        if (
          result.selected.some(
            (f) => getActivePassageReview(f.passageId)?.reviewStatus !== "approved",
          )
        ) {
          bucket.unapprovedSelected += 1;
        }

        const sources = new Set(result.selected.map((f) => f.sourceId));
        console.log(
          `  ${result.mode.padEnd(13)} ${person.name}: sources=${result.sourceDiversity} dist=${result.distanceDiversity} quality=${result.quality.total} single=${result.singleSourceDominance} [${[...sources].join(",")}]`,
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
            (id) =>
              id.includes("haguruma") || id.includes("ahou"),
          );
          if (onlyDeathWorks && sources.size <= 2 && !sources.has("src-akutagawa-shuju")) {
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
      const comparisons = await compareRetrievalModes({
        question,
        personId: person.id,
        modes: ["deterministic", "semantic", "hybrid"],
      });
      for (const result of comparisons) {
        const titles = result.selected.map(
          (f) => f.sourceId.replace(/^src-[^-]+-/, ""),
        );
        console.log(
          `  ${result.mode.padEnd(13)} ${person.name}: ${titles.join(" / ")} (Q=${result.quality.total})`,
        );
      }
    }
  }

  console.log("\n=== MODE AGGREGATES ===");
  for (const mode of modes) {
    const bucket = aggregates[mode];
    const n = Math.max(1, bucket.n);
    console.log(
      [
        mode,
        `avgQuality=${(bucket.quality / n).toFixed(1)}`,
        `avgSourceDiv=${(bucket.sourceDiversity / n).toFixed(2)}`,
        `avgDistDiv=${(bucket.distanceDiversity / n).toFixed(2)}`,
        `singleSource=${bucket.singleSource}`,
        `trustLowWarnings=${bucket.trustRejects}`,
        `unapprovedSelected=${bucket.unapprovedSelected}`,
        `highOverclaimSelected=${bucket.highOverclaimSelected}`,
      ].join(" · "),
    );
  }

  console.log("\n=== COLLAPSE CHECKS ===");
  console.log(`Dazai single-source domination events: ${dazaiSingleSource}`);
  console.log(`Akutagawa death-collapse events: ${akutagawaDeathCollapse}`);
  console.log(`Soseki individualism-collapse events: ${sosekiIndivCollapse}`);

  const failed =
    dazaiSingleSource > 0 ||
    akutagawaDeathCollapse > 0 ||
    sosekiIndivCollapse > 0 ||
    aggregates.semantic.unapprovedSelected > 0 ||
    aggregates.hybrid.unapprovedSelected > 0;

  console.log(failed ? "\nFAIL" : "\nPASS");
  closeReviewDb();
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
