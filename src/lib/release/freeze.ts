import { createHash } from "node:crypto";
import freezeArtifact from "@/data/release/approved-public-beta-v0.1.json";
import type {
  FrozenPublicBetaCase,
  PublicBetaFreezeArtifact,
} from "@/types/release";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { EvidenceBoundedProseOutput } from "@/types/prose";

export const PUBLIC_BETA_FREEZE_PATH =
  "src/data/release/approved-public-beta-v0.1.json";

export const PUBLIC_BETA_VERSION = "0.1.0";

function normalizeQuestion(question: string): string {
  return question.replace(/\s+/g, " ").trim();
}

export function hashFreezeCases(cases: FrozenPublicBetaCase[]): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        cases.map((c) => ({
          fixtureId: c.fixtureId,
          personId: c.personId,
          claimIds: c.claimIds,
          proseAllowed: c.proseAllowed,
          skeletonSections: c.skeleton.sections,
          proseSections: c.prose?.sections ?? null,
        })),
      ),
    )
    .digest("hex");
}

export function validateFreezeArtifact(
  artifact: PublicBetaFreezeArtifact,
): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (artifact.version !== PUBLIC_BETA_VERSION) {
    issues.push(`unexpected freeze version ${artifact.version}`);
  }
  if (artifact.experimentId !== "B") {
    issues.push("freeze must be Experiment B");
  }
  if (hashFreezeCases(artifact.cases) !== artifact.contentHash) {
    issues.push("freeze contentHash mismatch");
  }
  for (const item of artifact.cases) {
    if (item.skeleton.claims.some((c) => !c.allowedInFinalPerspective)) {
      issues.push(`${item.fixtureId}/${item.personId}: rejected/unallowed claim`);
    }
    if (item.prose && !item.proseAllowed) {
      issues.push(`${item.fixtureId}/${item.personId}: blocked prose included`);
    }
    if (
      item.claimIds.length === 0 &&
      item.skeleton.availability !== "insufficient"
    ) {
      issues.push(`${item.fixtureId}/${item.personId}: no claims`);
    }
    if (item.evidenceIds.length === 0 && item.skeleton.availability !== "insufficient") {
      issues.push(`${item.fixtureId}/${item.personId}: missing provenance evidence`);
    }
  }
  return { ok: issues.length === 0, issues };
}

export function loadPublicBetaFreeze(): PublicBetaFreezeArtifact {
  return freezeArtifact as PublicBetaFreezeArtifact;
}

export function lookupFrozenCase(args: {
  question: string;
  personId: string;
  fixtureId?: string;
}): FrozenPublicBetaCase | null {
  const freeze = loadPublicBetaFreeze();
  const q = normalizeQuestion(args.question);
  return (
    freeze.cases.find((c) => {
      if (c.personId !== args.personId) return false;
      if (args.fixtureId && args.fixtureId !== "adhoc" && c.fixtureId === args.fixtureId) {
        return true;
      }
      return normalizeQuestion(c.question) === q;
    }) ?? null
  );
}

export function lookupFrozenSkeletons(
  question: string,
): EvidenceBoundedPerspectiveSkeleton[] | null {
  const freeze = loadPublicBetaFreeze();
  const q = normalizeQuestion(question);
  const matched = freeze.cases.filter((c) => normalizeQuestion(c.question) === q);
  if (matched.length < 3) return null;
  return matched.map((c) => c.skeleton);
}

export function lookupFrozenProse(
  question: string,
  personId: string,
): EvidenceBoundedProseOutput | undefined {
  const hit = lookupFrozenCase({ question, personId });
  if (!hit?.proseAllowed) return undefined;
  return hit.prose;
}
