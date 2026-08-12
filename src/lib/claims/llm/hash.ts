import type { EvidencePacket } from "@/types/perspective-claim";

/** Stable hash of the evidence content that constrains LLM proposals. */
export function hashEvidencePacket(packet: EvidencePacket): string {
  const payload = JSON.stringify({
    personId: packet.personId,
    question: packet.question.rawQuestion,
    evidence: packet.evidence.map((item) => ({
      id: item.id,
      fragmentId: item.fragmentId,
      sourceId: item.sourceId,
      sourceTitle: item.sourceTitle,
      normalizedMeaning: item.normalizedMeaning,
      themes: item.themes,
      voiceType: item.voiceType,
      authorialDistance: item.authorialDistance,
      evidenceRole: item.evidenceRole,
      passageText: item.passageText ?? "",
    })),
    tensions: packet.tensions,
  });
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `pkt-${(hash >>> 0).toString(16)}`;
}
