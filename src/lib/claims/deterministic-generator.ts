import { people } from "@/data/people";
import type {
  AuthorialAttribution,
  ClaimEvidenceLink,
  EvidencePacket,
  EvidencePacketItem,
  PerspectiveClaim,
  PerspectiveClaimGenerator,
} from "@/types/perspective-claim";

const WORK_VOICES = new Set([
  "narrator",
  "fictional_character",
  "dialogue",
]);

/** Deterministic claim ids for human-eval persistence across regenerations. */
export function stableClaimId(parts: string[]): string {
  let hash = 2166136261;
  const input = parts.join("|");
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `claim-${(hash >>> 0).toString(16)}`;
}

function personName(personId: string): string {
  return people.find((p) => p.id === personId)?.name ?? personId;
}

function attributionForItem(item: EvidencePacketItem): AuthorialAttribution {
  if (WORK_VOICES.has(item.voiceType) || item.evidenceRole === "work-perspective") {
    return "work-level";
  }
  if (
    item.authorialDistance === "direct" &&
    item.interpretationType === "direct-author-statement"
  ) {
    return "direct-author";
  }
  if (item.authorialDistance === "near" || item.authorialDistance === "direct") {
    return "near-author";
  }
  return "work-level";
}

function observationText(item: EvidencePacketItem): string {
  if (attributionForItem(item) === "work-level") {
    return `『${item.sourceTitle}』には、${trimMeaning(item.normalizedMeaning)}という視点が作品内の声として現れる。`;
  }
  if (attributionForItem(item) === "direct-author") {
    return `『${item.sourceTitle}』の記述では、${trimMeaning(item.normalizedMeaning)}と述べられている。`;
  }
  return `『${item.sourceTitle}』の資料からは、${trimMeaning(item.normalizedMeaning)}という観測が読み取れる。`;
}

function trimMeaning(text: string): string {
  const compact = text.replace(/\s+/g, "").trim();
  if (compact.length <= 80) return compact.replace(/。$/, "");
  return `${compact.slice(0, 78)}…`;
}

function link(
  claimId: string,
  evidenceId: string,
  relation: ClaimEvidenceLink["relation"],
): ClaimEvidenceLink {
  return { claimId, evidenceId, relation };
}

function baseClaim(
  partial: Omit<
    PerspectiveClaim,
    | "supportStatus"
    | "allowedInFinalPerspective"
    | "validationIssues"
    | "confidence"
  > & { confidence?: PerspectiveClaim["confidence"] },
): PerspectiveClaim {
  return {
    ...partial,
    confidence: partial.confidence ?? "medium",
    supportStatus: "unclear",
    allowedInFinalPerspective: false,
    validationIssues: [],
  };
}

/**
 * Deterministic claims from Selected Evidence only.
 * Claim IDs are stable for human evaluation persistence.
 */
export class DeterministicClaimGenerator implements PerspectiveClaimGenerator {
  async generate(packet: EvidencePacket): Promise<PerspectiveClaim[]> {
    const claims: PerspectiveClaim[] = [];
    const name = personName(packet.personId);
    const items = packet.evidence;
    if (items.length === 0) return claims;

    for (const item of items.slice(0, 3)) {
      const text = observationText(item);
      const id = stableClaimId([
        packet.personId,
        packet.question.rawQuestion,
        "archive-observation",
        item.id,
        text,
      ]);
      const attribution = attributionForItem(item);
      claims.push(
        baseClaim({
          id,
          personId: packet.personId,
          claimType: "archive-observation",
          text,
          evidenceIds: [item.id],
          authorialAttribution: attribution,
          interpretationDistance: "low",
          historicalTransfer: "none",
          confidence: item.supportStatus === "supported" ? "high" : "medium",
          links: [link(id, item.id, "direct-support")],
        }),
      );
    }

    const themeList = Array.from(
      new Set(items.flatMap((i) => i.themes)),
    ).slice(0, 4);
    if (themeList.length >= 2) {
      const ids = items.slice(0, 4).map((i) => i.id);
      const text = `${name}の残した資料からは、${themeList.join("・")}といった観点を、この相談へ接続できる。`;
      const claimId = stableClaimId([
        packet.personId,
        packet.question.rawQuestion,
        "writer-perspective",
        ids.join(","),
        text,
      ]);
      const attributions = new Set(items.map(attributionForItem));
      const attribution: AuthorialAttribution =
        ids.length > 1 || attributions.size > 1
          ? "mixed"
          : Array.from(attributions)[0] === "direct-author"
            ? "near-author"
            : (Array.from(attributions)[0] ?? "mixed");
      claims.push(
        baseClaim({
          id: claimId,
          personId: packet.personId,
          claimType: "writer-perspective",
          text,
          evidenceIds: ids,
          authorialAttribution: attribution,
          interpretationDistance: "medium",
          historicalTransfer: "limited",
          confidence: "medium",
          links: ids.map((eid) => link(claimId, eid, "partial-support")),
        }),
      );
    }

    const sources = new Set(items.map((i) => i.sourceId));
    if (sources.size >= 2) {
      const ids = items.slice(0, 4).map((i) => i.id);
      const titles = Array.from(new Set(items.map((i) => i.sourceTitle))).slice(
        0,
        3,
      );
      const text = `${titles.map((t) => `『${t}』`).join("と")}を並べると、社会的な位置づけと内面的な距離の双方が、この問いに関係しているように見える。`;
      const claimId = stableClaimId([
        packet.personId,
        packet.question.rawQuestion,
        "cross-evidence-synthesis",
        ids.join(","),
        text,
      ]);
      claims.push(
        baseClaim({
          id: claimId,
          personId: packet.personId,
          claimType: "cross-evidence-synthesis",
          text,
          evidenceIds: ids,
          authorialAttribution: "mixed",
          interpretationDistance: "medium",
          historicalTransfer: "limited",
          confidence: "medium",
          links: ids.map((eid) => link(claimId, eid, "partial-support")),
        }),
      );
    }

    for (const tension of packet.tensions.slice(0, 1)) {
      const claimId = stableClaimId([
        packet.personId,
        packet.question.rawQuestion,
        "cross-evidence-synthesis",
        "tension",
        tension.evidenceIds.join(","),
        tension.description,
      ]);
      claims.push(
        baseClaim({
          id: claimId,
          personId: packet.personId,
          claimType: "cross-evidence-synthesis",
          text: tension.description,
          evidenceIds: tension.evidenceIds,
          authorialAttribution: "mixed",
          interpretationDistance: "medium",
          historicalTransfer: "none",
          confidence: "medium",
          links: tension.evidenceIds.map((eid) =>
            link(claimId, eid, "contrast"),
          ),
        }),
      );
    }

    const modern = buildModernTransfer(packet);
    if (modern) claims.push(modern);

    const rqEvidence = items.slice(0, 3).map((i) => i.id);
    const rqText = returnedQuestionText(packet);
    const rqId = stableClaimId([
      packet.personId,
      packet.question.rawQuestion,
      "returned-question",
      rqEvidence.join(","),
      rqText,
    ]);
    claims.push(
      baseClaim({
        id: rqId,
        personId: packet.personId,
        claimType: "returned-question",
        text: rqText,
        evidenceIds: rqEvidence,
        authorialAttribution: "none",
        interpretationDistance: "high",
        historicalTransfer: "explicit",
        confidence: "medium",
        links: rqEvidence.map((eid) => link(rqId, eid, "context")),
      }),
    );

    return claims;
  }
}

function buildModernTransfer(packet: EvidencePacket): PerspectiveClaim | null {
  const q = packet.question.rawQuestion;
  const themes = new Set(packet.evidence.flatMap((i) => i.themes));
  const ids = packet.evidence.slice(0, 4).map((i) => i.id);
  if (ids.length === 0) return null;

  let text: string | null = null;
  if (/AI|人工知能|仕事を奪/.test(q)) {
    const aspects: string[] = [];
    if (themes.has("work") || themes.has("independence")) aspects.push("仕事や独立");
    if (themes.has("society") || themes.has("obligation")) aspects.push("社会的役割");
    if (themes.has("self") || themes.has("shame") || themes.has("approval")) {
      aspects.push("自己像");
    }
    if (themes.has("money")) aspects.push("金銭と生活");
    text = `この問いには、AIという語彙そのものではなく、資料に見られる${aspects.length ? aspects.join("や") : "個人と社会の摩擦"}という観点を、現在の職業変化へ接続できる。`;
  } else if (/SNS/.test(q)) {
    text =
      "この問いには、資料に見られる自己観察・他者の視線・自己演出といった観点を、SNSを見続けてしまう現在の感覚へ接続することはできる。";
  } else if (/成功|幸福/.test(q)) {
    text =
      "この問いには、資料に見られる承認・自己像・幸福の定義といった観点を、成功と幸福の乖離という現在の感覚へ接続できる。";
  } else if (/歳|老い/.test(q)) {
    text =
      "この問いには、資料に見られる時間・帰属・自己像の変化といった観点を、歳を取ることへの恐れという現在の感覚へ接続できる。";
  } else if (packet.question.relevantThemes.length > 0) {
    text = `この問いには、資料に見られる${packet.question.relevantThemes
      .slice(0, 3)
      .join("・")}という観点を、現在の相談へ限定的に接続できる。`;
  }
  if (!text) return null;

  const claimId = stableClaimId([
    packet.personId,
    packet.question.rawQuestion,
    "modern-transfer",
    ids.join(","),
    text,
  ]);
  return baseClaim({
    id: claimId,
    personId: packet.personId,
    claimType: "modern-transfer",
    text,
    evidenceIds: ids,
    authorialAttribution: "none",
    interpretationDistance: "high",
    historicalTransfer: "explicit",
    confidence: "medium",
    links: ids.map((eid) => link(claimId, eid, "partial-support")),
  });
}

function returnedQuestionText(packet: EvidencePacket): string {
  const q = packet.question.rawQuestion;
  if (/AI|仕事を奪/.test(q)) {
    return "あなたが恐れているのは、収入の喪失と、社会的自己像の喪失のどちらに近いでしょうか。";
  }
  if (/SNS/.test(q)) {
    return "見続けることで埋めようとしているのは、退屈でしょうか。承認でしょうか。それとも、取り残される恐れでしょうか。";
  }
  if (/成功|幸福/.test(q)) {
    return "「成功」の定義を誰から借りていますか。あなた自身の幸福の定義は、どこにありますか。";
  }
  if (/歳|老い/.test(q)) {
    return "歳を取ること自体が怖いのでしょうか。それとも、まだ生きていない自分の物語が残っている感覚でしょうか。";
  }
  return (
    packet.question.possibleHiddenQuestion ??
    "この資料群が残す問いは、あなたが本当に失いたくないものは何か、という点にあります。"
  );
}

export const defaultClaimGenerator = new DeterministicClaimGenerator();
