import { people } from "@/data/people";
import { getFragmentsByPersonId } from "@/data/fragments";
import { getPassageById } from "@/data/passages";
import { getSourceById } from "@/data/sources";
import { getPassageReview } from "@/data/reviews/passages";
import { getFragmentReview } from "@/data/reviews/fragments";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { analyzeQuestion } from "@/lib/question-analysis";
import { detectOverclaimRisk } from "@/lib/overclaim";
import {
  isPrimaryEvidenceEligible,
  isRetrievableFragment,
  matchedThemesFor,
  MockPerspectiveRetriever,
  scoreFragmentBreakdown,
} from "@/lib/retrieval";
import type {
  FixtureRetrievalAudit,
  PersonRetrievalAudit,
  RejectionReason,
  RetrievalCandidateAudit,
} from "@/types/retrieval-audit";

const retriever = new MockPerspectiveRetriever();

function collectRejectionReasons(
  fragmentId: string,
  personId: string,
  selectedIds: Set<string>,
  selectedSources: Set<string>,
  hasDirectSelected: boolean,
): RejectionReason[] {
  const frag = getFragmentsByPersonId(personId).find((f) => f.id === fragmentId);
  if (!frag || selectedIds.has(frag.id)) return [];

  const reasons: RejectionReason[] = [];
  const passage = getPassageById(frag.passageId);
  const review = passage ? getPassageReview(passage.id) : undefined;
  const fragReview = getFragmentReview(frag.id);
  const auto = detectOverclaimRisk(frag, passage);
  const risk = fragReview?.overclaimRisk ?? auto.risk;
  const gate = isRetrievableFragment(frag);

  if (!gate.ok) {
    for (const reason of gate.reasons) {
      if (reason === "rejected review") reasons.push("rejected review");
      else if (reason === "high overclaim risk") {
        reasons.push("high overclaim risk");
      } else {
        reasons.push("unapproved");
      }
    }
  }

  if (passage?.verificationStatus === "placeholder") {
    reasons.push("placeholder");
  }
  if (review?.reviewStatus === "needs-review") {
    reasons.push("needs-review not primary");
  }
  if (review && review.reviewStatus !== "approved") {
    reasons.push("unapproved");
  }
  if (risk === "high") reasons.push("high overclaim risk");
  if (frag.confidence === "low") reasons.push("low confidence");
  if (selectedSources.has(frag.sourceId)) reasons.push("duplicate source");
  if (hasDirectSelected && frag.authorialDistance === "indirect") {
    reasons.push("indirect when direct available");
  }
  if (!isPrimaryEvidenceEligible(frag) && reasons.length === 0) {
    reasons.push("needs-review not primary");
  }
  if (reasons.length === 0) reasons.push("lower theme relevance");
  if (selectedIds.size >= 3) reasons.push("slot filled");

  return Array.from(new Set(reasons));
}

export async function auditPersonRetrieval(
  personId: string,
  question: string,
): Promise<PersonRetrievalAudit> {
  const person = people.find((p) => p.id === personId);
  const analysis = analyzeQuestion(question);
  const selected = await retriever.retrieve(personId, analysis);
  const selectedIds = new Set(selected.map((f) => f.id));
  const selectedSources = new Set(selected.map((f) => f.sourceId));
  const hasDirectSelected = selected.some(
    (f) => f.authorialDistance === "direct",
  );

  const candidates: RetrievalCandidateAudit[] = getFragmentsByPersonId(personId)
    .map((fragment) => {
      const score = scoreFragmentBreakdown(fragment, analysis, personId);
      const source = getSourceById(fragment.sourceId);
      const selectedFlag = selectedIds.has(fragment.id);

      return {
        fragmentId: fragment.id,
        passageId: fragment.passageId,
        sourceId: fragment.sourceId,
        sourceTitle: source?.title ?? fragment.sourceId,
        matchedThemes: matchedThemesFor(fragment, analysis),
        authorialDistance: fragment.authorialDistance,
        score,
        selected: selectedFlag,
        rejectionReasons: selectedFlag
          ? []
          : collectRejectionReasons(
              fragment.id,
              personId,
              selectedIds,
              selectedSources,
              hasDirectSelected,
            ),
      };
    })
    .sort((a, b) => b.score.total - a.score.total);

  return {
    personId,
    personName: person?.name ?? personId,
    question,
    candidates,
    selectedIds: selected.map((f) => f.id),
    rejectedIds: candidates.filter((c) => !c.selected).map((c) => c.fragmentId),
  };
}

export async function auditFixtureRetrieval(
  fixtureId: string,
): Promise<FixtureRetrievalAudit | undefined> {
  const fixture = FIXTURE_QUESTIONS.find((f) => f.id === fixtureId);
  if (!fixture) return undefined;
  const peopleAudits = await Promise.all(
    people.map((person) => auditPersonRetrieval(person.id, fixture.question)),
  );
  return {
    fixtureId: fixture.id,
    question: fixture.question,
    people: peopleAudits,
  };
}

export async function auditAllFixtures(): Promise<FixtureRetrievalAudit[]> {
  const out: FixtureRetrievalAudit[] = [];
  for (const fixture of FIXTURE_QUESTIONS) {
    const audit = await auditFixtureRetrieval(fixture.id);
    if (audit) out.push(audit);
  }
  return out;
}
