import { people } from "@/data/people";
import {
  analyzeCrossWriterDistinctiveness,
  buildWriterFingerprint,
} from "@/lib/claims/distinctiveness";
import { PUBLIC_LENS_JA, themeLabelJa } from "@/lib/public/labels";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { PublicThreeWriterSummary } from "@/types/public";

/**
 * Deterministic public summary from approved fingerprints.
 * Never LLM-generated.
 */
export function buildPublicThreeWriterSummary(
  skeletons: EvidenceBoundedPerspectiveSkeleton[],
): PublicThreeWriterSummary {
  const claimsByPerson = Object.fromEntries(
    skeletons.map((s) => [s.personId, s.claims]),
  );
  const question = skeletons[0]?.question ?? "";
  const cross = analyzeCrossWriterDistinctiveness({
    question,
    claimsByPerson,
  });

  const whereTheyLook = people.map((person) => {
    const lens = PUBLIC_LENS_JA[person.id];
    const fingerprint = buildWriterFingerprint(
      person.id,
      claimsByPerson[person.id] ?? [],
    );
    const dominant = fingerprint.dominantThemes[0];
    const fromTheme = dominant ? themeLabelJa(dominant) : undefined;
    return {
      personId: person.id,
      personName: person.name,
      text: lens?.where ?? fromTheme ?? person.primaryLens,
    };
  });

  const shared = cross.sharedThemes.map(themeLabelJa).filter(Boolean);

  const different = cross.writerSpecificThemes.map((row) => {
    const person = people.find((p) => p.id === row.personId);
    const lens = PUBLIC_LENS_JA[row.personId];
    const specific = row.themes[0]
      ? themeLabelJa(row.themes[0])
      : lens?.short;
    return {
      personId: row.personId,
      personName: person?.name ?? row.personId,
      text: specific ?? "",
    };
  });

  return { whereTheyLook, shared, different };
}
