/**
 * v0.1.1 public query resolution hotfix.
 * Routing only — no new interpretation.
 */
import { analyzeQuestion } from "../src/lib/question-analysis";
import { observePublicBeta } from "../src/lib/public/observe";
import { PUBLIC_LENS_JA } from "../src/lib/public/labels";
import { resolvePublicQuery } from "../src/lib/public/query-resolver";
import {
  ALL_INSUFFICIENT_COMPARE_NOTICE,
  buildPublicThreeWriterSummary,
} from "../src/lib/public/summary";
import type { EvidenceBoundedPerspectiveSkeleton } from "../src/types/perspective-claim";
import type { PublicQueryFamilyId } from "../src/types/public-query";
import { closeReviewDb } from "../src/lib/review/db";
import { loadLocalEnv } from "./load-env";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const LENS_LEAKS = Object.values(PUBLIC_LENS_JA).flatMap((lens) => [
  lens.short,
  lens.where,
]);

function resolveFamily(question: string) {
  return resolvePublicQuery(question, analyzeQuestion(question));
}

function expectFamily(
  question: string,
  familyId: PublicQueryFamilyId,
): boolean {
  const resolution = resolveFamily(question);
  const ok =
    resolution.status === "matched" && resolution.familyId === familyId;
  console.log(
    `  ${ok ? "PASS" : "FAIL"} ${question} → ${resolution.status}/${resolution.familyId ?? "none"}`,
  );
  return ok;
}

function expectNotFamily(
  question: string,
  familyId: PublicQueryFamilyId,
): boolean {
  const resolution = resolveFamily(question);
  const ok = resolution.familyId !== familyId || resolution.status !== "matched";
  console.log(
    `  ${ok ? "PASS" : "FAIL"} ${question} → ${resolution.status}/${resolution.familyId ?? "none"} (not ${familyId})`,
  );
  return ok;
}

function emptySkeleton(
  personId: string,
  personName: string,
  availability: EvidenceBoundedPerspectiveSkeleton["availability"],
): EvidenceBoundedPerspectiveSkeleton {
  return {
    personId,
    personName,
    question: "x",
    availability,
    sections: {
      archiveObservation: [],
      acrossSources: [],
      connectionToQuestion: [],
      returnedQuestion: [],
    },
    claimIds: [],
    evidenceIds: [],
    claims: [],
    humanReviewed: false,
  };
}

async function main() {
  loadLocalEnv();
  console.log("Dead Writers Observatory — public query resolution hotfix\n");

  const aiVariants = [
    "AIに自分の仕事を奪われる気がします",
    "AIに仕事を奪われる気がしてすごく不安です",
    "AIやばくない？俺の仕事なくなる？",
    "生成AIのせいで仕事がなくなりそう",
  ];
  console.log("AI JOB LOSS VARIANTS");
  const aiOk = aiVariants.map((q) => expectFamily(q, "ai-job-loss"));
  console.log(`${aiOk.filter(Boolean).length} / ${aiVariants.length} matched`);
  console.log("family: ai-job-loss\n");
  assert(aiOk.every(Boolean), "ai-job-loss variants");

  const lonelinessVariants = [
    "友達はいるのに孤独です",
    "人と会ってるのにずっと一人な感じ",
    "周りに人はいるけど孤独",
  ];
  console.log("LONELINESS");
  const lonelyOk = lonelinessVariants.map((q) => expectFamily(q, "loneliness"));
  console.log(`${lonelyOk.filter(Boolean).length} / ${lonelinessVariants.length} matched\n`);
  assert(lonelyOk.every(Boolean), "loneliness variants");

  const snsVariants = [
    "SNSを何度も見てしまう",
    "スマホでSNSばかり確認してしまう",
    "通知が気になって何回も開く",
  ];
  console.log("SNS");
  const snsOk = snsVariants.map((q) => expectFamily(q, "sns-compulsion"));
  console.log(`${snsOk.filter(Boolean).length} / ${snsVariants.length} matched\n`);
  assert(snsOk.every(Boolean), "sns variants");

  const agingVariants = [
    "老いるのが怖い",
    "年を取るのが嫌だ",
    "このまま歳を取っていくのが不安",
  ];
  console.log("AGING");
  const agingOk = agingVariants.map((q) => expectFamily(q, "aging-fear"));
  console.log(`${agingOk.filter(Boolean).length} / ${agingVariants.length} matched\n`);
  assert(agingOk.every(Boolean), "aging variants");

  const successVariants = [
    "成功したはずなのに幸せじゃない",
    "仕事もうまくいってるのに満たされない",
    "欲しかったものを得たのに幸福感がない",
  ];
  console.log("SUCCESS");
  const successOk = successVariants.map((q) =>
    expectFamily(q, "success-without-happiness"),
  );
  console.log(`${successOk.filter(Boolean).length} / ${successVariants.length} matched\n`);
  assert(successOk.every(Boolean), "success variants");

  console.log("NEGATIVE TESTS");
  const negatives = [
    expectNotFamily("AIで小説を書きたい", "ai-job-loss"),
    expectNotFamily("SNSマーケティングを仕事にしたい", "sns-compulsion"),
    expectNotFamily("老人ホームを探しています", "aging-fear"),
    expectNotFamily("友達に貸したお金が返ってこない", "loneliness"),
  ];
  console.log(`${negatives.filter(Boolean).length} / ${negatives.length} not overmatched\n`);
  assert(negatives.every(Boolean), "negative overmatch");

  const ambiguous = resolveFamily(
    "会社も辞めたいし、AIで仕事もなくなりそうで怖い",
  );
  assert(ambiguous.status === "ambiguous", `ambiguous expected, got ${ambiguous.status}`);
  console.log("AMBIGUOUS: PASS (silent, no forced family)\n");

  const unmatched = resolveFamily("今日の天気は何ですか");
  assert(unmatched.status === "unmatched", "unmatched weather question");
  const unmatchedObserve = await observePublicBeta("今日の天気は何ですか", "skeleton");
  assert(
    unmatchedObserve.writers.every((w) => w.availability === "insufficient"),
    "unmatched remains silent",
  );
  console.log("UNMATCHED: PASS (insufficient / archive silence)\n");

  const death = await observePublicBeta(
    "死ぬことを考えることがあります。どう生きればいいのでしょうか。",
    "skeleton",
  );
  assert(death.queryResolution.familyId === "death-and-how-to-live", "death family");
  assert(Boolean(death.observation.safetyNotice), "safety notice retained");
  console.log("SAFETY ORDERING: PASS (family + safety notice)\n");

  const productionBug = "AIに仕事を奪われる気がしてすごく不安です。";
  const repro = await observePublicBeta(productionBug, "skeleton");
  assert(repro.queryResolution.familyId === "ai-job-loss", "production bug family");
  assert(repro.queryResolution.status === "matched", "production bug matched");
  const soseki = repro.writers.find((w) => w.personId === "person-soseki")!;
  const akutagawa = repro.writers.find((w) => w.personId === "person-akutagawa")!;
  const dazai = repro.writers.find((w) => w.personId === "person-dazai")!;
  assert(soseki.availability === "available", "soseki available");
  assert(akutagawa.availability === "available", "akutagawa available");
  assert(dazai.availability === "available", "dazai available");
  assert(soseki.archiveParagraphs.length > 0, "soseki archive body");
  assert(akutagawa.archiveParagraphs.length > 0, "akutagawa archive body");
  assert(dazai.archiveParagraphs.length > 0, "dazai archive body");
  assert(repro.question === productionBug, "user question preserved");
  assert(!repro.summary.allInsufficient, "comparison not all-insufficient");
  console.log("PRODUCTION BUG REPRO: PASS");
  console.log(`  family: ${repro.queryResolution.familyId}`);
  console.log(`  Soseki: ${soseki.availability}`);
  console.log(`  Akutagawa: ${akutagawa.availability}`);
  console.log(`  Dazai: ${dazai.availability}\n`);

  const allInsufficientSummary = buildPublicThreeWriterSummary([
    emptySkeleton("person-soseki", "夏目漱石", "insufficient"),
    emptySkeleton("person-akutagawa", "芥川龍之介", "insufficient"),
    emptySkeleton("person-dazai", "太宰治", "insufficient"),
  ]);
  assert(allInsufficientSummary.allInsufficient, "all-insufficient flag");
  assert(
    allInsufficientSummary.insufficientNotice === ALL_INSUFFICIENT_COMPARE_NOTICE,
    "all-insufficient notice",
  );
  const leakCount = [
    ...allInsufficientSummary.whereTheyLook,
    ...allInsufficientSummary.different,
  ].filter((row) => LENS_LEAKS.includes(row.text)).length;
  assert(leakCount === 0, "lens fallback leaked on all-insufficient");
  const silenceObserve = await observePublicBeta("あ", "skeleton");
  const observeLeak = [
    ...silenceObserve.summary.whereTheyLook,
    ...silenceObserve.summary.different,
  ].filter((row) => LENS_LEAKS.includes(row.text)).length;
  assert(observeLeak === 0, "observe all-insufficient lens leak");
  assert(silenceObserve.summary.allInsufficient, "observe all-insufficient");

  console.log("COMPARISON AVAILABILITY");
  console.log(`all-insufficient summary leak: ${observeLeak + leakCount}`);
  console.log("meaning-equivalent variants: PASS");
  console.log("negative overmatch: PASS");
  console.log("comparison insufficient: PASS");
  console.log("\nPASS");

  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  closeReviewDb();
  process.exit(1);
});
