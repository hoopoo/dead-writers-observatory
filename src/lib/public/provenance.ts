import { getFragmentById } from "@/data/fragments";
import { getPersonById } from "@/data/people";
import { getSourceById } from "@/data/sources";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { PublicProvenanceSource } from "@/types/public";
import {
  attributionDistanceLabel,
  attributionVoiceLabel,
  workVoiceWarning,
} from "@/lib/public/labels";
import type { AuthorialAttribution } from "@/types/perspective-claim";

const CLOSENESS: Record<AuthorialAttribution, number> = {
  "direct-author": 4,
  "near-author": 3,
  "work-level": 2,
  mixed: 1,
  none: 0,
};

function closerAttribution(
  a: AuthorialAttribution,
  b: AuthorialAttribution,
): AuthorialAttribution {
  return CLOSENESS[a] >= CLOSENESS[b] ? a : b;
}

export function buildPublicProvenance(
  skeleton: EvidenceBoundedPerspectiveSkeleton,
): PublicProvenanceSource[] {
  const person = getPersonById(skeleton.personId);
  const personName = person?.name ?? skeleton.personName;
  const bySource = new Map<
    string,
    { attribution: AuthorialAttribution; hasWorkVoice: boolean }
  >();

  for (const claim of skeleton.claims) {
    for (const evidenceId of claim.evidenceIds) {
      const fragment = getFragmentById(evidenceId);
      const sourceId = fragment?.sourceId;
      if (!sourceId) continue;
      const current = bySource.get(sourceId);
      const hasWorkVoice =
        claim.authorialAttribution === "work-level" ||
        Boolean(current?.hasWorkVoice);
      if (!current) {
        bySource.set(sourceId, {
          attribution: claim.authorialAttribution,
          hasWorkVoice,
        });
      } else {
        bySource.set(sourceId, {
          attribution: closerAttribution(
            current.attribution,
            claim.authorialAttribution,
          ),
          hasWorkVoice,
        });
      }
    }
  }

  const items: PublicProvenanceSource[] = [];
  for (const [sourceId, meta] of bySource) {
    const source = getSourceById(sourceId);
    if (!source) continue;
    items.push({
      sourceId,
      title: source.title,
      personName,
      voiceLabel: attributionVoiceLabel(meta.attribution),
      distanceLabel: attributionDistanceLabel(meta.attribution),
      workVoiceWarning:
        meta.hasWorkVoice || meta.attribution === "work-level"
          ? workVoiceWarning(personName)
          : undefined,
    });
  }

  return items;
}

export function skeletonHasModernTransfer(
  skeleton: EvidenceBoundedPerspectiveSkeleton,
): boolean {
  return skeleton.claims.some(
    (c) =>
      c.claimType === "modern-transfer" || c.historicalTransfer === "explicit",
  );
}
