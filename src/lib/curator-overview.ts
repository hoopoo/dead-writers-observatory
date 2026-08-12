import { people } from "@/data/people";
import { passages, getPassagesBySourceId, getPassagesByPersonId } from "@/data/passages";
import { fragments } from "@/data/fragments";
import { getSourcesByPersonId, getSourceById } from "@/data/sources";
import { getPassageReview } from "@/data/reviews/passages";
import { getFragmentReview } from "@/data/reviews/fragments";
import { computeArchiveHealth } from "@/lib/archive-health";
import {
  isApprovedDirectEvidence,
  isDirectAuthorEvidence,
  isWorkVoice,
} from "@/lib/evidence";
import { detectOverclaimRisk } from "@/lib/overclaim";
import {
  computeAllRagReadiness,
  computeGlobalRagReadiness,
} from "@/lib/rag-readiness";
import type { AuthorialDistance } from "@/types/thought-fragment";
import type { VoiceType } from "@/types/source-passage";

export interface PendingArchiveItem {
  passageId: string;
  personName: string;
  sourceTitle: string;
  themes: string[];
  voice: VoiceType;
  distance: AuthorialDistance | "unknown";
  reasonPending: string;
  requiredActions: string[];
}

export interface SourceTreeNode {
  sourceId: string;
  title: string;
  sourceType: string;
  verifiedCount: number;
  approvedCount: number;
  placeholderCount: number;
  voiceDistribution: Record<string, number>;
  distanceDistribution: Record<string, number>;
  fragmentCount: number;
  riskCount: number;
  passages: Array<{
    passageId: string;
    verificationStatus: string;
    reviewStatus: string;
    voiceType: VoiceType;
    authorialDistance: AuthorialDistance | "unknown";
    isDirectAuthor: boolean;
    isWorkVoice: boolean;
  }>;
}

export function getGlobalArchiveSummary() {
  const health = people.map((p) => computeArchiveHealth(p.id));
  const verified = passages.filter((p) => p.verificationStatus === "verified").length;
  const approved = passages.filter((p) => {
    const review = getPassageReview(p.id);
    return review?.reviewStatus === "approved";
  }).length;
  const placeholder = passages.filter(
    (p) => p.verificationStatus === "placeholder",
  ).length;
  const directAuthor = passages.filter((p) =>
    isDirectAuthorEvidence(p, getPassageReview(p.id)),
  ).length;
  const workVoice = passages.filter((p) => {
    const review = getPassageReview(p.id);
    return isApprovedDirectEvidence(p, review) && isWorkVoice(p);
  }).length;
  let highOverclaim = 0;
  for (const fragment of fragments) {
    const passage = passages.find((p) => p.id === fragment.passageId);
    const review = getFragmentReview(fragment.id);
    const auto = detectOverclaimRisk(fragment, passage);
    if ((review?.overclaimRisk ?? auto.risk) === "high") highOverclaim += 1;
  }
  const unresolved = health.reduce((sum, h) => sum + h.unresolvedReviews, 0);

  return {
    verified,
    approved,
    placeholder,
    directAuthor,
    workVoice,
    highOverclaim,
    unresolved,
    health,
    rag: computeGlobalRagReadiness(),
    peopleReady: computeAllRagReadiness(),
  };
}

export function listPendingArchiveWork(): PendingArchiveItem[] {
  return passages
    .filter((passage) => {
      const review = getPassageReview(passage.id);
      return (
        passage.verificationStatus === "placeholder" ||
        !review ||
        review.reviewStatus === "pending" ||
        review.reviewStatus === "needs-review"
      );
    })
    .map((passage) => {
      const person = people.find((p) => p.id === passage.personId);
      const source = getSourceById(passage.sourceId);
      const linked = fragments.filter((f) => f.passageId === passage.id);
      const distance = linked[0]?.authorialDistance ?? "unknown";
      const themes = Array.from(new Set(linked.flatMap((f) => f.themes)));
      const requiredActions: string[] = [];
      if (passage.verificationStatus !== "verified" || !passage.text) {
        requiredActions.push("verified text");
      }
      if (!passage.locator.anchor && !passage.locator.section) {
        requiredActions.push("exact locator");
      }
      requiredActions.push("voice review");
      requiredActions.push("fragment support review");

      return {
        passageId: passage.id,
        personName: person?.name ?? passage.personId,
        sourceTitle: source?.title ?? passage.sourceId,
        themes,
        voice: passage.voiceType,
        distance,
        reasonPending:
          passage.verificationStatus === "placeholder"
            ? "PLACEHOLDER"
            : `review=${getPassageReview(passage.id)?.reviewStatus ?? "none"}`,
        requiredActions,
      };
    });
}

export function buildPersonArchiveTree(personId: string): SourceTreeNode[] {
  const sources = getSourcesByPersonId(personId);
  return sources.map((source) => {
    const sourcePassages = getPassagesBySourceId(source.id);
    const voiceDistribution: Record<string, number> = {};
    const distanceDistribution: Record<string, number> = {};
    let verifiedCount = 0;
    let approvedCount = 0;
    let placeholderCount = 0;
    let fragmentCount = 0;
    let riskCount = 0;

    const passageNodes = sourcePassages.map((passage) => {
      const review = getPassageReview(passage.id);
      const linked = fragments.filter((f) => f.passageId === passage.id);
      fragmentCount += linked.length;
      if (passage.verificationStatus === "verified") verifiedCount += 1;
      if (passage.verificationStatus === "placeholder") placeholderCount += 1;
      if (review?.reviewStatus === "approved") approvedCount += 1;
      voiceDistribution[passage.voiceType] =
        (voiceDistribution[passage.voiceType] ?? 0) + 1;
      for (const fragment of linked) {
        distanceDistribution[fragment.authorialDistance] =
          (distanceDistribution[fragment.authorialDistance] ?? 0) + 1;
        const fragReview = getFragmentReview(fragment.id);
        const auto = detectOverclaimRisk(fragment, passage);
        if ((fragReview?.overclaimRisk ?? auto.risk) === "high") {
          riskCount += 1;
        }
      }
      return {
        passageId: passage.id,
        verificationStatus: passage.verificationStatus,
        reviewStatus: review?.reviewStatus ?? "pending",
        voiceType: passage.voiceType,
        authorialDistance: linked[0]?.authorialDistance ?? "unknown",
        isDirectAuthor: isDirectAuthorEvidence(passage, review),
        isWorkVoice: isWorkVoice(passage),
      };
    });

    return {
      sourceId: source.id,
      title: source.title,
      sourceType: source.sourceType,
      verifiedCount,
      approvedCount,
      placeholderCount,
      voiceDistribution,
      distanceDistribution,
      fragmentCount,
      riskCount,
      passages: passageNodes,
    };
  });
}

export function getPersonPassages(personId: string) {
  return getPassagesByPersonId(personId);
}
