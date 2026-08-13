import { people } from "@/data/people";
import {
  analyzeCrossWriterDistinctiveness,
  buildWriterFingerprint,
} from "@/lib/claims/distinctiveness";
import { themeLabelJa } from "@/lib/public/labels";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { PublicSummaryWriterRow, PublicThreeWriterSummary } from "@/types/public";

export const ALL_INSUFFICIENT_COMPARE_NOTICE =
  "今回の問いについて、現在のArchiveからは3つの視点を十分に組み立てられませんでした。";

export const WRITER_INSUFFICIENT_COMPARE_TEXT =
  "現在のArchiveでは十分な接続なし";

function hasApprovedClaims(
  skeleton: EvidenceBoundedPerspectiveSkeleton,
): boolean {
  return skeleton.claims.some((claim) => claim.allowedInFinalPerspective);
}

/**
 * Deterministic public summary from approved fingerprints.
 * Never LLM-generated. Never fall back to writer lenses.
 */
export function buildPublicThreeWriterSummary(
  skeletons: EvidenceBoundedPerspectiveSkeleton[],
): PublicThreeWriterSummary {
  const byPerson = new Map(skeletons.map((s) => [s.personId, s]));
  const allInsufficient = people.every((person) => {
    const skeleton = byPerson.get(person.id);
    return !skeleton || skeleton.availability === "insufficient";
  });

  if (allInsufficient) {
    return {
      allInsufficient: true,
      insufficientNotice: ALL_INSUFFICIENT_COMPARE_NOTICE,
      whereTheyLook: [],
      shared: [],
      different: [],
    };
  }

  const usableSkeletons = skeletons.filter(
    (skeleton) =>
      skeleton.availability !== "insufficient" && hasApprovedClaims(skeleton),
  );
  const claimsByPerson = Object.fromEntries(
    usableSkeletons.map((s) => [s.personId, s.claims]),
  );
  const question = skeletons[0]?.question ?? "";
  const cross =
    usableSkeletons.length >= 2
      ? analyzeCrossWriterDistinctiveness({
          question,
          claimsByPerson,
        })
      : null;

  const whereTheyLook: PublicSummaryWriterRow[] = people.map((person) => {
    const skeleton = byPerson.get(person.id);
    const availability = skeleton?.availability ?? "insufficient";
    if (availability === "insufficient" || !skeleton || !hasApprovedClaims(skeleton)) {
      return {
        personId: person.id,
        personName: person.name,
        text: WRITER_INSUFFICIENT_COMPARE_TEXT,
        availability: availability === "limited" ? "limited" : "insufficient",
      };
    }
    const fingerprint = buildWriterFingerprint(person.id, skeleton.claims);
    const dominant = fingerprint.dominantThemes[0];
    const fromTheme = dominant ? themeLabelJa(dominant) : undefined;
    return {
      personId: person.id,
      personName: person.name,
      text:
        fromTheme ??
        (availability === "limited" ? "接続は限られています" : ""),
      availability,
    };
  });

  const shared = (cross?.sharedThemes ?? []).map(themeLabelJa).filter(Boolean);

  const different: PublicSummaryWriterRow[] = people.map((person) => {
    const skeleton = byPerson.get(person.id);
    const availability = skeleton?.availability ?? "insufficient";
    if (availability === "insufficient" || !skeleton || !hasApprovedClaims(skeleton)) {
      return {
        personId: person.id,
        personName: person.name,
        text: WRITER_INSUFFICIENT_COMPARE_TEXT,
        availability: availability === "limited" ? "limited" : "insufficient",
      };
    }
    const specific = cross?.writerSpecificThemes.find((row) => row.personId === person.id)
      ?.themes[0];
    return {
      personId: person.id,
      personName: person.name,
      text: specific ? themeLabelJa(specific) : "",
      availability,
    };
  });

  return {
    allInsufficient: false,
    whereTheyLook,
    shared,
    different,
  };
}
