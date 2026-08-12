import { people } from "@/data/people";
import { passages } from "@/data/passages";
import { computeArchiveHealth } from "@/lib/archive-health";
import { getPassageReview } from "@/data/reviews/passages";
import type {
  GlobalRagReadiness,
  GlobalRagStatus,
  RagReadiness,
} from "@/types/rag-readiness";

export function computeRagReadiness(personId: string): RagReadiness {
  const person = people.find((p) => p.id === personId);
  const health = computeArchiveHealth(personId);
  const personPassages = passages.filter((p) => p.personId === personId);
  const total = Math.max(1, personPassages.length);
  const verified = personPassages.filter(
    (p) => p.verificationStatus === "verified",
  ).length;
  const approved = personPassages.filter((p) => {
    const review = getPassageReview(p.id);
    return review?.reviewStatus === "approved";
  }).length;

  const unclassified = personPassages.filter((p) => {
    // distance is carried on fragments; passage must at least have voice + statement flag.
    return !p.voiceType;
  }).length;

  const reasons: string[] = [];
  const healthOk =
    health.readiness === "strong" || health.readiness === "usable";
  if (!healthOk) {
    reasons.push(`ArchiveHealth is ${health.readiness}`);
  }
  if (health.approvedPassages === 0) {
    reasons.push("approved evidence missing");
  }
  if (health.highRiskInterpretations > 0) {
    reasons.push(
      `high overclaim risk = ${health.highRiskInterpretations}`,
    );
  }
  if (health.sourceDiversity < 2) {
    reasons.push("source diversity below minimum (2)");
  }
  if (unclassified > 0) {
    reasons.push("voice/distance classification incomplete");
  }
  if (health.unresolvedReviews > 0) {
    reasons.push(
      `${health.unresolvedReviews} critical unresolved review(s)`,
    );
  }

  const readyForRag =
    healthOk &&
    health.approvedPassages > 0 &&
    health.highRiskInterpretations === 0 &&
    health.sourceDiversity >= 2 &&
    unclassified === 0 &&
    health.unresolvedReviews === 0;

  if (readyForRag) {
    reasons.push("Archive Gate passed for semantic retrieval prep");
  }

  return {
    personId,
    personName: person?.name ?? personId,
    archiveHealth: health,
    verifiedRatio: verified / total,
    approvedRatio: approved / total,
    unresolvedHighRisk: health.highRiskInterpretations,
    sourceDiversity: health.sourceDiversity,
    readyForRag,
    reasons,
  };
}

export function computeAllRagReadiness(): RagReadiness[] {
  return people.map((person) => computeRagReadiness(person.id));
}

export function computeGlobalRagReadiness(): GlobalRagReadiness {
  const peopleReady = computeAllRagReadiness();
  const placeholderCount = passages.filter(
    (p) => p.verificationStatus === "placeholder",
  ).length;
  const unresolvedReviews = peopleReady.reduce(
    (sum, item) => sum + item.archiveHealth.unresolvedReviews,
    0,
  );
  const highOverclaimRisk = peopleReady.reduce(
    (sum, item) => sum + item.unresolvedHighRisk,
    0,
  );

  const reasons: string[] = [];
  if (placeholderCount > 0) {
    reasons.push(`${placeholderCount} placeholder passage(s)`);
  }
  if (unresolvedReviews > 0) {
    reasons.push(`${unresolvedReviews} unresolved review(s)`);
  }
  if (highOverclaimRisk > 0) {
    reasons.push(`${highOverclaimRisk} high overclaim risk`);
  }

  const allReady = peopleReady.every((p) => p.readyForRag);
  let status: GlobalRagStatus;
  if (!allReady || highOverclaimRisk > 0) {
    status = "NOT READY";
    for (const person of peopleReady.filter((p) => !p.readyForRag)) {
      reasons.push(`${person.personName}: ${person.reasons.join("; ")}`);
    }
  } else if (placeholderCount > 0 || unresolvedReviews > 0) {
    status = "READY WITH KNOWN MINOR DEBT";
  } else {
    status = "READY";
    reasons.push("All writers passed Archive Gate");
  }

  return {
    status,
    people: peopleReady,
    reasons,
    placeholderCount,
    unresolvedReviews,
    highOverclaimRisk,
  };
}
