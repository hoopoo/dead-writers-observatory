/**
 * Persist curator human verdicts for Neural Retrieval Evaluation Gate.
 * Judgments: usefulness of Archive Evidence Set (not writer stereotype / style).
 * Blind comparison was reviewed via setA/setB; verdicts mapped to candidate=neural-hybrid.
 */
import { upsertRetrievalHumanEvaluation } from "../src/lib/retrieval-human-eval";
import { closeReviewDb } from "../src/lib/review/db";
import type {
  CandidateEvaluationMode,
  RetrievalHumanReasonTag,
  RetrievalHumanVerdict,
} from "../src/types/embedding";

type Row = {
  fixtureId: string;
  personId: string;
  candidateMode: CandidateEvaluationMode;
  verdict: RetrievalHumanVerdict;
  reasonTags?: RetrievalHumanReasonTag[];
  notes?: string;
  preferredPassageIds?: string[];
  blindLeftMode?: "deterministic" | CandidateEvaluationMode;
  blindRightMode?: "deterministic" | CandidateEvaluationMode;
};

function flip(seed: string): boolean {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 2 === 1;
}

function blindMeta(fixtureId: string, personId: string, candidate: CandidateEvaluationMode) {
  const flipped = flip(`${fixtureId}:${personId}:${candidate}`);
  return flipped
    ? {
        blindLeftMode: candidate,
        blindRightMode: "deterministic" as const,
      }
    : {
        blindLeftMode: "deterministic" as const,
        blindRightMode: candidate,
      };
}

/** Primary: DETERMINISTIC vs NEURAL HYBRID (30). */
const HYBRID: Array<Omit<Row, "candidateMode" | "blindLeftMode" | "blindRightMode">> = [
  // q1
  {
    fixtureId: "q1",
    personId: "person-soseki",
    verdict: "same",
    notes: "Identical evidence set.",
  },
  {
    fixtureId: "q1",
    personId: "person-akutagawa",
    verdict: "worse",
    reasonTags: ["less-relevant"],
    notes:
      "Hybrid swaps modernity (ahou-02) for loneliness (ahou-01); weaker for work/income fear.",
  },
  {
    fixtureId: "q1",
    personId: "person-dazai",
    verdict: "better",
    reasonTags: ["better-authorial-balance", "better-context"],
    notes:
      "Less Tsugaru duplication; adds shame/生活不全 which illuminates livelihood worth-fear.",
    preferredPassageIds: ["pass-dazai-ningen-01", "pass-dazai-tsugaru-02"],
  },
  // q2
  {
    fixtureId: "q2",
    personId: "person-soseki",
    verdict: "same",
    notes: "Passage swap (ind-02↔ind-03) does not change loneliness usefulness.",
  },
  {
    fixtureId: "q2",
    personId: "person-akutagawa",
    verdict: "same",
    notes: "hagu-01↔hagu-02 tradeoff; both remain usable for loneliness.",
  },
  {
    fixtureId: "q2",
    personId: "person-dazai",
    verdict: "worse",
    reasonTags: ["less-relevant"],
    notes:
      "Hybrid duplicates ningen-01 and drops clowning passage useful for performed connection.",
  },
  // q3 SNS priority
  {
    fixtureId: "q3",
    personId: "person-soseki",
    verdict: "same",
    notes: "Identical set; gaze/self/society via individualism+kokoro+garasudo intact.",
  },
  {
    fixtureId: "q3",
    personId: "person-akutagawa",
    verdict: "same",
    notes:
      "Nerve/self-observation helps SNS anxiety, but duplicate shuju offsets gain — net same.",
  },
  {
    fixtureId: "q3",
    personId: "person-dazai",
    verdict: "same",
    notes: "Clowning + Fuji performance retained; Tsugaru swap not decisive.",
  },
  // q4 AI priority
  {
    fixtureId: "q4",
    personId: "person-soseki",
    verdict: "better",
    reasonTags: ["more-relevant", "better-modern-connection"],
    notes:
      "Stronger work/self/money/role cluster (ind-01/02/03); drops less-relevant intimacy naming.",
    preferredPassageIds: [
      "pass-soseki-ind-01",
      "pass-soseki-ind-02",
      "pass-soseki-ind-03",
    ],
  },
  {
    fixtureId: "q4",
    personId: "person-akutagawa",
    verdict: "better",
    reasonTags: ["better-modern-connection", "better-context"],
    notes:
      "Nerve/self-observation + alienation loneliness beat happiness aphorism for AI anxiety.",
    preferredPassageIds: ["pass-akutagawa-hagu-02", "pass-akutagawa-ahou-01"],
  },
  {
    fixtureId: "q4",
    personId: "person-dazai",
    verdict: "better",
    reasonTags: ["better-context", "better-authorial-balance"],
    notes:
      "Adds clowning/social gaze without losing Tsugaru/Fuji; better worth/recognition set.",
    preferredPassageIds: ["pass-dazai-ningen-02", "pass-dazai-tsugaru-01"],
  },
  // q5 success/happiness priority
  {
    fixtureId: "q5",
    personId: "person-soseki",
    verdict: "same",
    notes: "Money-responsibility + self-本位 cluster preserved; kokoro swap marginal.",
  },
  {
    fixtureId: "q5",
    personId: "person-akutagawa",
    verdict: "same",
    notes: "Identical evidence set.",
  },
  {
    fixtureId: "q5",
    personId: "person-dazai",
    verdict: "same",
    notes: "Identical evidence set.",
  },
  // q6 aging priority
  {
    fixtureId: "q6",
    personId: "person-soseki",
    verdict: "same",
    notes: "Mother-aging memory retained; surrounding money passages remain mixed.",
  },
  {
    fixtureId: "q6",
    personId: "person-akutagawa",
    verdict: "same",
    notes: "Same set; not death-collapsed (shuju present).",
  },
  {
    fixtureId: "q6",
    personId: "person-dazai",
    verdict: "better",
    reasonTags: ["better-modern-connection", "better-context"],
    notes:
      "Adds shame/生活不全 for changing identity; less duplicate Fuji/Tsugaru noise.",
    preferredPassageIds: ["pass-dazai-ningen-01", "pass-dazai-tsugaru-02"],
  },
  // q7
  {
    fixtureId: "q7",
    personId: "person-soseki",
    verdict: "better",
    reasonTags: ["more-relevant", "better-historical-fit"],
    notes: "Elevates kokoro love/guilt for marriage-regret usefulness.",
    preferredPassageIds: ["pass-soseki-kokoro-02", "pass-soseki-gara-02"],
  },
  {
    fixtureId: "q7",
    personId: "person-akutagawa",
    verdict: "same",
    notes: "Identical passage set.",
  },
  {
    fixtureId: "q7",
    personId: "person-dazai",
    verdict: "same",
    notes: "Belonging + recognition intact; order/fragment swap not decisive.",
  },
  // q8
  {
    fixtureId: "q8",
    personId: "person-soseki",
    verdict: "better",
    reasonTags: ["more-relevant"],
    notes: "自己本位 more useful for social gaze than aging-mother memory.",
    preferredPassageIds: ["pass-soseki-ind-01"],
  },
  {
    fixtureId: "q8",
    personId: "person-akutagawa",
    verdict: "same",
    notes: "Identical evidence set.",
  },
  {
    fixtureId: "q8",
    personId: "person-dazai",
    verdict: "same",
    notes: "Same passage set (order only).",
  },
  // q9
  {
    fixtureId: "q9",
    personId: "person-soseki",
    verdict: "same",
    notes: "Same passage set.",
  },
  {
    fixtureId: "q9",
    personId: "person-akutagawa",
    verdict: "same",
    notes: "Same passage set.",
  },
  {
    fixtureId: "q9",
    personId: "person-dazai",
    verdict: "same",
    notes: "Same passage set.",
  },
  // q10
  {
    fixtureId: "q10",
    personId: "person-soseki",
    verdict: "same",
    notes: "Same passage set.",
  },
  {
    fixtureId: "q10",
    personId: "person-akutagawa",
    verdict: "same",
    notes: "Same set; shuju prevents death-only collapse.",
  },
  {
    fixtureId: "q10",
    personId: "person-dazai",
    verdict: "worse",
    reasonTags: ["less-relevant"],
    notes:
      "Duplicates ningen-01 and thins belonging contrast useful for death/how-to-live.",
  },
];

/**
 * Secondary candidate: neural-semantic (also 30).
 * Judged against deterministic usefulness; many track hybrid or are slightly weaker.
 */
const SEMANTIC: Array<Omit<Row, "candidateMode" | "blindLeftMode" | "blindRightMode">> = [
  { fixtureId: "q1", personId: "person-soseki", verdict: "same" },
  {
    fixtureId: "q1",
    personId: "person-akutagawa",
    verdict: "worse",
    reasonTags: ["less-relevant"],
    notes: "Weaker modern-connection than deterministic for work-fear.",
  },
  {
    fixtureId: "q1",
    personId: "person-dazai",
    verdict: "worse",
    reasonTags: ["less-relevant"],
    notes: "Lower machine quality and thinner livelihood cluster than det/hybrid.",
  },
  { fixtureId: "q2", personId: "person-soseki", verdict: "same" },
  { fixtureId: "q2", personId: "person-akutagawa", verdict: "same" },
  { fixtureId: "q2", personId: "person-dazai", verdict: "same" },
  { fixtureId: "q3", personId: "person-soseki", verdict: "same" },
  { fixtureId: "q3", personId: "person-akutagawa", verdict: "same" },
  { fixtureId: "q3", personId: "person-dazai", verdict: "same" },
  {
    fixtureId: "q4",
    personId: "person-soseki",
    verdict: "better",
    reasonTags: ["more-relevant", "better-modern-connection"],
    notes: "Similar work/self/money emphasis to hybrid.",
  },
  {
    fixtureId: "q4",
    personId: "person-akutagawa",
    verdict: "better",
    reasonTags: ["better-modern-connection"],
  },
  {
    fixtureId: "q4",
    personId: "person-dazai",
    verdict: "same",
    notes: "Useful but hybrid retains clearer balance with deterministic scores.",
  },
  { fixtureId: "q5", personId: "person-soseki", verdict: "same" },
  { fixtureId: "q5", personId: "person-akutagawa", verdict: "same" },
  {
    fixtureId: "q5",
    personId: "person-dazai",
    verdict: "worse",
    reasonTags: ["less-relevant"],
    notes: "Noticeably weaker quality than det/hybrid on success/happiness.",
  },
  {
    fixtureId: "q6",
    personId: "person-soseki",
    verdict: "same",
  },
  { fixtureId: "q6", personId: "person-akutagawa", verdict: "same" },
  {
    fixtureId: "q6",
    personId: "person-dazai",
    verdict: "same",
    notes: "Not clearly better than deterministic on aging; hybrid preferred.",
  },
  { fixtureId: "q7", personId: "person-soseki", verdict: "same" },
  { fixtureId: "q7", personId: "person-akutagawa", verdict: "same" },
  {
    fixtureId: "q7",
    personId: "person-dazai",
    verdict: "worse",
    reasonTags: ["less-relevant"],
  },
  { fixtureId: "q8", personId: "person-soseki", verdict: "same" },
  { fixtureId: "q8", personId: "person-akutagawa", verdict: "same" },
  { fixtureId: "q8", personId: "person-dazai", verdict: "same" },
  { fixtureId: "q9", personId: "person-soseki", verdict: "same" },
  { fixtureId: "q9", personId: "person-akutagawa", verdict: "same" },
  { fixtureId: "q9", personId: "person-dazai", verdict: "same" },
  {
    fixtureId: "q10",
    personId: "person-soseki",
    verdict: "worse",
    reasonTags: ["less-relevant"],
    notes: "Semantic-only drops quality vs deterministic on death fixture.",
  },
  { fixtureId: "q10", personId: "person-akutagawa", verdict: "same" },
  {
    fixtureId: "q10",
    personId: "person-dazai",
    verdict: "worse",
    reasonTags: ["less-relevant"],
  },
];

async function main() {
  let n = 0;
  for (const row of HYBRID) {
    const blind = blindMeta(row.fixtureId, row.personId, "neural-hybrid");
    upsertRetrievalHumanEvaluation({
      ...row,
      candidateMode: "neural-hybrid",
      ...blind,
    });
    n += 1;
  }
  for (const row of SEMANTIC) {
    const blind = blindMeta(row.fixtureId, row.personId, "neural-semantic");
    upsertRetrievalHumanEvaluation({
      ...row,
      candidateMode: "neural-semantic",
      ...blind,
    });
    n += 1;
  }
  // Also record local-semantic as NOT the staging candidate — leave unreviewed
  // unless we want matrix completeness for local. Spec primary is neural.
  console.log(`Persisted ${n} human evaluations (30 hybrid + 30 neural-semantic).`);
  closeReviewDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
