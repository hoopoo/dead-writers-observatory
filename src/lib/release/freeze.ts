import { createHash } from "node:crypto";
import freezeArtifact from "@/data/release/approved-public-beta-v0.1.json";
import { people } from "@/data/people";
import type {
  FrozenPublicBetaCase,
  PublicBetaFreezeArtifact,
} from "@/types/release";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { EvidenceBoundedProseOutput } from "@/types/prose";

export const PUBLIC_BETA_FREEZE_PATH =
  "src/data/release/approved-public-beta-v0.1.json";

/** Freeze artifact SoT — approved claims unchanged in the v0.1.1 hotfix. */
export const PUBLIC_BETA_VERSION = "0.1.0";
export const PUBLIC_HOTFIX_VERSION = "0.1.1";
export const PUBLIC_BETA_LABEL = "v0.1.1 Public Beta";

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

export function lookupFrozenSkeletonsByFixtureId(
  fixtureId: string,
): EvidenceBoundedPerspectiveSkeleton[] | null {
  if (!fixtureId || fixtureId === "adhoc") return null;
  const freeze = loadPublicBetaFreeze();
  const matched = freeze.cases.filter((c) => c.fixtureId === fixtureId);
  const byPerson = new Map(matched.map((c) => [c.personId, c.skeleton]));
  const ordered = people
    .map((person) => byPerson.get(person.id))
    .filter((item): item is EvidenceBoundedPerspectiveSkeleton => Boolean(item));
  if (ordered.length < 3) return null;
  return ordered;
}

export function lookupFrozenSkeletons(
  question: string,
  fixtureId?: string,
): EvidenceBoundedPerspectiveSkeleton[] | null {
  const byFixture = fixtureId
    ? lookupFrozenSkeletonsByFixtureId(fixtureId)
    : null;
  if (byFixture) return byFixture;
  const freeze = loadPublicBetaFreeze();
  const q = normalizeQuestion(question);
  const matched = freeze.cases.filter((c) => normalizeQuestion(c.question) === q);
  if (matched.length < 3) return null;
  return matched.map((c) => c.skeleton);
}

export function lookupFrozenProse(
  question: string,
  personId: string,
  fixtureId?: string,
): EvidenceBoundedProseOutput | undefined {
  const hit = lookupFrozenCase({ question, personId, fixtureId });
  if (!hit?.proseAllowed) return undefined;
  return hit.prose;
}
