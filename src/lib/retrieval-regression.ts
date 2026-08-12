import fs from "node:fs";
import path from "node:path";
import { fragments } from "@/data/fragments";
import {
  getActiveFragmentReview,
  getActivePassageReview,
} from "@/lib/review/active";
import { buildRetrievalSnapshotBundle } from "@/lib/retrieval-snapshot";
import type {
  RetrievalSnapshot,
  RetrievalSnapshotBundle,
  WriterRetrievalSnapshot,
} from "@/types/retrieval-quality";

export const BASELINE_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "src/data/retrieval-snapshots/v1.json",
);

export function loadBaselineSnapshot(): RetrievalSnapshotBundle | null {
  if (!fs.existsSync(BASELINE_SNAPSHOT_PATH)) return null;
  const raw = fs.readFileSync(BASELINE_SNAPSHOT_PATH, "utf8");
  return JSON.parse(raw) as RetrievalSnapshotBundle;
}

export function writeBaselineSnapshot(bundle: RetrievalSnapshotBundle): void {
  fs.mkdirSync(path.dirname(BASELINE_SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(
    BASELINE_SNAPSHOT_PATH,
    `${JSON.stringify(bundle, null, 2)}\n`,
    "utf8",
  );
}

export interface InvariantFailure {
  fixtureId: string;
  personId: string;
  code: string;
  detail: string;
}

export function evaluateWriterInvariants(
  fixtureId: string,
  writer: WriterRetrievalSnapshot,
): InvariantFailure[] {
  const failures: InvariantFailure[] = [];

  // A: single-source domination
  if (writer.diversity.singleSourceDominance) {
    failures.push({
      fixtureId,
      personId: writer.personId,
      code: "A_SINGLE_SOURCE",
      detail: `all ${writer.selectedPassageIds.length} from one source`,
    });
  }

  // B: if archive has approved direct/near for this person, avoid indirect-only selections.
  const hasNonIndirectArchive = fragments.some((fragment) => {
    if (fragment.personId !== writer.personId) return false;
    if (
      fragment.authorialDistance !== "direct" &&
      fragment.authorialDistance !== "near"
    ) {
      return false;
    }
    const review = getActivePassageReview(fragment.passageId);
    return review?.reviewStatus === "approved";
  });
  if (
    hasNonIndirectArchive &&
    writer.selectedPassageIds.length >= 2 &&
    writer.directCount === 0 &&
    writer.nearCount === 0 &&
    writer.indirectCount === writer.selectedPassageIds.length
  ) {
    failures.push({
      fixtureId,
      personId: writer.personId,
      code: "B_INDIRECT_ONLY",
      detail: "indirect-only while direct/near archive exists",
    });
  }

  // C/D/E: review integrity on selected passages
  for (const passageId of writer.selectedPassageIds) {
    const review = getActivePassageReview(passageId);
    if (!review || review.reviewStatus !== "approved") {
      failures.push({
        fixtureId,
        personId: writer.personId,
        code: "C_UNAPPROVED",
        detail: passageId,
      });
    }
    if (review?.reviewStatus === "rejected") {
      failures.push({
        fixtureId,
        personId: writer.personId,
        code: "D_REJECTED",
        detail: passageId,
      });
    }
    if (review?.reviewStatus === "needs-review") {
      failures.push({
        fixtureId,
        personId: writer.personId,
        code: "D_NEEDS_REVIEW",
        detail: passageId,
      });
    }
  }

  for (const fragmentId of writer.selectedFragmentIds) {
    const fragReview = getActiveFragmentReview(fragmentId);
    if (fragReview?.overclaimRisk === "high") {
      failures.push({
        fixtureId,
        personId: writer.personId,
        code: "E_HIGH_OVERCLAIM",
        detail: fragmentId,
      });
    }
  }

  // F: minimum source diversity when selecting 3+
  if (writer.selectedPassageIds.length >= 3 && writer.sourceDiversity < 2) {
    failures.push({
      fixtureId,
      personId: writer.personId,
      code: "F_DIVERSITY",
      detail: `sourceDiversity=${writer.sourceDiversity}`,
    });
  }

  return failures;
}

export function evaluateSnapshotInvariants(
  snapshot: RetrievalSnapshot,
): InvariantFailure[] {
  return snapshot.writers.flatMap((writer) =>
    evaluateWriterInvariants(snapshot.fixtureId, writer),
  );
}

export async function runRetrievalRegression(): Promise<{
  current: RetrievalSnapshotBundle;
  failures: InvariantFailure[];
  summary: {
    fixturesPass: number;
    fixturesTotal: number;
    singleSource: number;
    unapproved: number;
    rejected: number;
    needsReview: number;
    highOverclaim: number;
  };
}> {
  const current = await buildRetrievalSnapshotBundle();
  const failures = current.fixtures.flatMap(evaluateSnapshotInvariants);

  const fixtureFailIds = new Set(failures.map((f) => f.fixtureId));
  return {
    current,
    failures,
    summary: {
      fixturesPass: current.fixtures.length - fixtureFailIds.size,
      fixturesTotal: current.fixtures.length,
      singleSource: failures.filter((f) => f.code === "A_SINGLE_SOURCE").length,
      unapproved: failures.filter((f) => f.code === "C_UNAPPROVED").length,
      rejected: failures.filter((f) => f.code === "D_REJECTED").length,
      needsReview: failures.filter((f) => f.code === "D_NEEDS_REVIEW").length,
      highOverclaim: failures.filter((f) => f.code === "E_HIGH_OVERCLAIM")
        .length,
    },
  };
}
