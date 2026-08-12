import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { analyzeQuestion } from "@/lib/question-analysis";
import {
  computePerspectiveDiversity,
  computeRetrievalQuality,
} from "@/lib/perspective-diversity";
import {
  getActiveFragmentReview,
  getActivePassageReview,
} from "@/lib/review/active";
import { detectOverclaimRisk } from "@/lib/overclaim";
import { getPassageById } from "@/data/passages";
import { MockPerspectiveRetriever } from "@/lib/retrieval";
import { auditPersonRetrieval } from "@/lib/retrieval-audit";
import type {
  RetrievalSnapshot,
  RetrievalSnapshotBundle,
  WriterRetrievalSnapshot,
} from "@/types/retrieval-quality";

const retriever = new MockPerspectiveRetriever();

export async function buildWriterSnapshot(
  personId: string,
  question: string,
): Promise<WriterRetrievalSnapshot> {
  const analysis = analyzeQuestion(question);
  const selected = await retriever.retrieve(personId, analysis);
  const audit = await auditPersonRetrieval(personId, question);

  const selectedPassageIds = selected.map((f) => f.passageId);
  const selectedSourceIds = Array.from(new Set(selected.map((f) => f.sourceId)));
  const authorialDistances = selected.map((f) => f.authorialDistance);
  const themes = Array.from(new Set(selected.flatMap((f) => f.themes)));

  let approvedCount = 0;
  let rejectedLeak = 0;
  let needsReviewLeak = 0;
  let highOverclaimLeak = 0;

  for (const fragment of selected) {
    const review = getActivePassageReview(fragment.passageId);
    const fragReview = getActiveFragmentReview(fragment.id);
    const passage = getPassageById(fragment.passageId);
    const auto = detectOverclaimRisk(fragment, passage);
    const risk = fragReview?.overclaimRisk ?? auto.risk;
    if (review?.reviewStatus === "approved") approvedCount += 1;
    if (review?.reviewStatus === "rejected") rejectedLeak += 1;
    if (review?.reviewStatus === "needs-review") needsReviewLeak += 1;
    if (risk === "high") highOverclaimLeak += 1;
  }

  const diversity = computePerspectiveDiversity(personId, selected);
  const avgRelevance =
    selected.length === 0
      ? 0
      : audit.candidates
          .filter((c) => c.selected)
          .reduce((sum, c) => sum + c.score.total, 0) / Math.max(1, selected.length);

  return {
    personId,
    selectedPassageIds,
    selectedFragmentIds: selected.map((f) => f.id),
    selectedSourceIds,
    authorialDistances,
    themes,
    sourceDiversity: selectedSourceIds.length,
    directCount: authorialDistances.filter((d) => d === "direct").length,
    nearCount: authorialDistances.filter((d) => d === "near").length,
    indirectCount: authorialDistances.filter((d) => d === "indirect").length,
    rejectedPassageIds: audit.candidates
      .filter((c) => !c.selected)
      .map((c) => c.passageId),
    diversity,
    quality: computeRetrievalQuality({
      relevance: avgRelevance,
      selected,
      approvedCount,
      rejectedLeak,
      needsReviewLeak,
      highOverclaimLeak,
    }),
  };
}

export async function buildFixtureSnapshot(
  fixtureId: string,
  question: string,
): Promise<RetrievalSnapshot> {
  const writers = await Promise.all(
    people.map((person) => buildWriterSnapshot(person.id, question)),
  );
  return { fixtureId, question, writers };
}

export async function buildRetrievalSnapshotBundle(): Promise<RetrievalSnapshotBundle> {
  const fixtures: RetrievalSnapshot[] = [];
  for (const fixture of FIXTURE_QUESTIONS) {
    fixtures.push(await buildFixtureSnapshot(fixture.id, fixture.question));
  }
  return {
    version: "v1",
    generatedAt: new Date().toISOString(),
    fixtures,
  };
}
