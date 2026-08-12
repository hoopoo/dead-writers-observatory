import { people } from "@/data/people";
import { passages } from "@/data/passages";
import { fragments } from "@/data/fragments";
import {
  getActiveFragmentReview,
  getActivePassageReview,
} from "@/lib/review/active";
import type { ArchiveHealth, ArchiveReadiness } from "@/types/archive-health";
import { isApprovedDirectEvidence, isDirectAuthorEvidence } from "@/lib/evidence";
import { detectOverclaimRisk } from "@/lib/overclaim";
import { getPassageById } from "@/data/passages";

function readinessFor(health: Omit<ArchiveHealth, "readiness" | "personName">): ArchiveReadiness {
  if (health.verifiedPassages === 0) return "placeholder";
  if (health.approvedPassages === 0) return "curating";
  if (
    health.approvedPassages >= 3 &&
    health.sourceDiversity >= 2 &&
    health.highRiskInterpretations === 0 &&
    health.unresolvedReviews <= 2
  ) {
    return health.approvedPassages >= 5 && health.sourceDiversity >= 3
      ? "strong"
      : "usable";
  }
  return "curating";
}

export function computeArchiveHealth(personId: string): ArchiveHealth {
  const person = people.find((p) => p.id === personId);
  const personPassages = passages.filter((p) => p.personId === personId);
  const personFragments = fragments.filter((f) => f.personId === personId);

  let verifiedPassages = 0;
  let approvedPassages = 0;
  let directEvidenceCount = 0;
  let nearEvidenceCount = 0;
  let indirectEvidenceCount = 0;
  let unresolvedReviews = 0;
  const sources = new Set<string>();

  for (const passage of personPassages) {
    sources.add(passage.sourceId);
    const review = getActivePassageReview(passage.id);
    if (passage.verificationStatus === "verified") verifiedPassages += 1;
    if (isApprovedDirectEvidence(passage, review)) {
      approvedPassages += 1;
      if (isDirectAuthorEvidence(passage, review)) directEvidenceCount += 1;
    }
    // Placeholder backlog is expected; track unresolved only among verified passages.
    if (
      passage.verificationStatus === "verified" &&
      (!review ||
        review.reviewStatus === "pending" ||
        review.reviewStatus === "needs-review")
    ) {
      unresolvedReviews += 1;
    }
  }

  for (const fragment of personFragments) {
    if (fragment.authorialDistance === "near") nearEvidenceCount += 1;
    if (fragment.authorialDistance === "indirect") indirectEvidenceCount += 1;
    if (fragment.authorialDistance === "direct") {
      // counted via passages for approved direct; keep fragment-level near/indirect
    }
  }

  // Prefer counting distance from fragments tied to this person.
  directEvidenceCount = personFragments.filter((f) => {
    const passage = getPassageById(f.passageId);
    return passage ? isDirectAuthorEvidence(passage) : false;
  }).length;

  nearEvidenceCount = personFragments.filter((f) => f.authorialDistance === "near").length;
  indirectEvidenceCount = personFragments.filter(
    (f) => f.authorialDistance === "indirect",
  ).length;

  let highRiskInterpretations = 0;
  for (const fragment of personFragments) {
    const review = getActiveFragmentReview(fragment.id);
    const passage = getPassageById(fragment.passageId);
    const auto = detectOverclaimRisk(fragment, passage);
    const risk = review?.overclaimRisk ?? auto.risk;
    if (risk === "high") highRiskInterpretations += 1;
  }

  const base = {
    personId,
    verifiedPassages,
    approvedPassages,
    directEvidenceCount,
    nearEvidenceCount,
    indirectEvidenceCount,
    sourceDiversity: sources.size,
    unresolvedReviews,
    highRiskInterpretations,
  };

  return {
    ...base,
    personName: person?.name ?? personId,
    readiness: readinessFor(base),
  };
}

export function computeAllArchiveHealth(): ArchiveHealth[] {
  return people.map((person) => computeArchiveHealth(person.id));
}
