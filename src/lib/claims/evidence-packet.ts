import { randomUUID } from "node:crypto";
import { getSourceById } from "@/data/sources";
import { getPassageById } from "@/data/passages";
import { analyzeHistoricalDistance } from "@/lib/historical-distance";
import { detectOverclaimRisk } from "@/lib/overclaim";
import { isWorkVoice } from "@/lib/evidence";
import {
  getActiveFragmentReview,
  getActivePassageReview,
} from "@/lib/review/active";
import { scoreFragmentBreakdown } from "@/lib/retrieval";
import type { QuestionAnalysis } from "@/types/question-analysis";
import type { ThoughtFragment } from "@/types/thought-fragment";
import type {
  EvidencePacket,
  EvidencePacketItem,
  EvidenceTension,
  ClaimSupportStatus,
} from "@/types/perspective-claim";
import type { EvidenceRole } from "@/types/evidence";
import type { ReviewStatus } from "@/types/review";

export interface PacketBuildResult {
  packet: EvidencePacket;
  rejected: Array<{ fragmentId: string; passageId: string; reasons: string[] }>;
}

function fragmentSupportStatus(
  fragmentId: string,
): ClaimSupportStatus {
  const review = getActiveFragmentReview(fragmentId);
  const meaning = review?.meaningSupportedByPassage;
  if (meaning === "supported") return "supported";
  if (meaning === "partially-supported") return "partially-supported";
  if (meaning === "unsupported") return "unsupported";
  return "unclear";
}

function evidenceRoleFor(
  fragment: ThoughtFragment,
  workVoice: boolean,
): EvidenceRole {
  if (workVoice || fragment.authorialDistance === "indirect") {
    return "work-perspective";
  }
  if (
    fragment.authorialDistance === "direct" ||
    fragment.interpretationType === "direct-author-statement"
  ) {
    return "author-statement";
  }
  return "context";
}

export function validateEvidenceForPacket(
  fragment: ThoughtFragment,
): { ok: true; item: Omit<EvidencePacketItem, "retrievalTrace"> } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  const passage = getPassageById(fragment.passageId);
  if (!passage) {
    return { ok: false, reasons: ["missing-passage"] };
  }

  const review = getActivePassageReview(passage.id);
  const reviewStatus: ReviewStatus = review?.reviewStatus ?? "pending";

  if (passage.verificationStatus !== "verified") reasons.push("unverified");
  if (reviewStatus !== "approved") {
    if (reviewStatus === "rejected") reasons.push("rejected");
    else if (reviewStatus === "needs-review") reasons.push("needs-review");
    else reasons.push("unapproved");
  }
  if (!passage.voiceType) reasons.push("missing-voice-metadata");
  if (!fragment.authorialDistance) reasons.push("missing-authorial-distance");

  const auto = detectOverclaimRisk(fragment, passage);
  const fragReview = getActiveFragmentReview(fragment.id);
  const overclaim = fragReview?.overclaimRisk ?? auto.risk;
  if (overclaim === "high") reasons.push("overclaim-high");

  const support = fragmentSupportStatus(fragment.id);
  if (support === "unsupported") reasons.push("unsupported-fragment");

  if (reasons.length > 0) return { ok: false, reasons };

  const workVoice = isWorkVoice(passage);
  return {
    ok: true,
    item: {
      id: fragment.id,
      passageId: passage.id,
      fragmentId: fragment.id,
      sourceId: fragment.sourceId,
      personId: fragment.personId,
      sourceTitle: getSourceById(fragment.sourceId)?.title ?? fragment.sourceId,
      passageText: passage.text?.trim().slice(0, 240),
      normalizedMeaning: fragment.normalizedMeaning,
      themes: fragment.themes,
      voiceType: passage.voiceType,
      authorialDistance: fragment.authorialDistance,
      interpretationType: fragment.interpretationType,
      verificationStatus: passage.verificationStatus,
      reviewStatus,
      supportStatus: support,
      overclaimRisk: overclaim,
      evidenceRole: evidenceRoleFor(fragment, workVoice),
    },
  };
}

function detectTensions(items: EvidencePacketItem[]): EvidenceTension[] {
  const tensions: EvidenceTension[] = [];
  const themes = new Set(items.flatMap((i) => i.themes));
  if (themes.has("independence") && themes.has("obligation")) {
    const ids = items
      .filter(
        (i) =>
          i.themes.includes("independence") || i.themes.includes("obligation"),
      )
      .map((i) => i.id);
    if (ids.length >= 2) {
      tensions.push({
        evidenceIds: ids.slice(0, 4),
        description:
          "資料の中では、個人の独立と社会的責任・義務の双方が緊張関係として現れている。",
      });
    }
  }
  if (themes.has("happiness") && themes.has("shame")) {
    const ids = items
      .filter(
        (i) => i.themes.includes("happiness") || i.themes.includes("shame"),
      )
      .map((i) => i.id);
    if (ids.length >= 2) {
      tensions.push({
        evidenceIds: ids.slice(0, 4),
        description:
          "資料の中では、幸福や承認の語りと、羞恥・自己不全の語りが並存している。",
      });
    }
  }
  const directs = items.filter((i) => i.authorialDistance === "direct");
  const works = items.filter((i) => i.evidenceRole === "work-perspective");
  if (directs.length > 0 && works.length > 0) {
    tensions.push({
      evidenceIds: [...directs.slice(0, 2), ...works.slice(0, 2)].map((i) => i.id),
      description:
        "作者本人に近い記述と作品内の声が併存しており、一つの人物像へ平坦化しない。",
    });
  }
  return tensions;
}

/**
 * Build an EvidencePacket from Selected Evidence only.
 * Claim generators must not read archive outside this packet.
 */
export function buildEvidencePacket(args: {
  personId: string;
  analysis: QuestionAnalysis;
  selected: ThoughtFragment[];
  retrievalMode?: string;
}): PacketBuildResult {
  const rejected: PacketBuildResult["rejected"] = [];
  const evidence: EvidencePacketItem[] = [];

  for (const fragment of args.selected) {
    const gate = validateEvidenceForPacket(fragment);
    if (!gate.ok) {
      rejected.push({
        fragmentId: fragment.id,
        passageId: fragment.passageId,
        reasons: gate.reasons,
      });
      continue;
    }
    const breakdown = scoreFragmentBreakdown(
      fragment,
      args.analysis,
      args.personId,
    );
    evidence.push({
      ...gate.item,
      retrievalTrace: {
        deterministicScore: breakdown.total,
        rerankScore: breakdown.total,
      },
    });
  }

  const packet: EvidencePacket = {
    id: `packet-${args.personId}-${randomUUID().slice(0, 8)}`,
    question: args.analysis,
    personId: args.personId,
    retrievalMode: args.retrievalMode ?? "deterministic",
    evidence,
    historicalDistance: analyzeHistoricalDistance(args.analysis),
    tensions: detectTensions(evidence),
    rejectedCandidates: rejected,
    createdAt: new Date().toISOString(),
  };

  return { packet, rejected };
}
