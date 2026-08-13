import type { PublicPerspectiveMode } from "@/types/public";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import type { EvidenceBoundedProseOutput } from "@/types/prose";

export type ReleaseBlockerType =
  | "safety"
  | "false-attribution"
  | "fake-quote"
  | "unsupported-meaning"
  | "writer-collapse"
  | "broken-provenance"
  | "runtime"
  | "broken-public-ui"
  | "privacy"
  | "other-critical";

export type BlindGateDecision = "PASS" | "FAIL" | "INCOMPLETE";

export interface PublicModeDecision {
  recommendedMode: PublicPerspectiveMode;
  reason: string;
  blindGatePassed: boolean;
  fallbackMode: "skeleton";
}

export interface PublicBetaReadinessV01 {
  archive: "ready" | "blocked";
  retrieval: "ready" | "blocked";
  claims: "ready" | "blocked";
  distinctiveness: "ready" | "blocked";
  prose: "ready" | "staging" | "blocked";
  blindCheck: "ready" | "pending" | "blocked";
  publicUX: "ready" | "blocked";
  releaseQA: "ready" | "pending" | "blocked";
  build: "ready" | "blocked";
  publicMode: PublicPerspectiveMode;
  blockers: string[];
  nonBlockingDebt: string[];
  readyForPublicBeta: boolean;
  status: "READY TO DEPLOY" | "NOT READY";
}

export interface FrozenPublicBetaCase {
  fixtureId: string;
  personId: string;
  question: string;
  skeleton: EvidenceBoundedPerspectiveSkeleton;
  prose?: EvidenceBoundedProseOutput;
  proseAllowed: boolean;
  claimIds: string[];
  evidenceIds: string[];
  sourceIds: string[];
}

export interface PublicBetaFreezeArtifact {
  version: string;
  generatedAt: string;
  experimentId: "B";
  promptVersion: string;
  contentHash: string;
  cases: FrozenPublicBetaCase[];
}

export interface ReleaseQAHumanRecord {
  id: string;
  result: "pass" | "needs-review" | "fail";
  blocker: boolean;
  blockerType?: ReleaseBlockerType;
  issues: string[];
  notes?: string;
}

export interface PublicBetaReleaseSnapshot {
  version: string;
  generatedAt: string;
  archiveStats: {
    writers: string[];
    passageCount: number;
    sourceCount: number;
  };
  retrievalMode: string;
  publicPerspectiveMode: PublicPerspectiveMode;
  blind: {
    reviewed: number;
    expected: number;
    decision: BlindGateDecision;
    materialMeaning: number;
    attributionUnsafe: number;
    prosePreferred: number;
    skeletonPreferred: number;
    same: number;
    readabilityBetterOrSame: number;
    usefulnessBetterOrSame: number;
  };
  releaseQa: {
    total: number;
    pass: number;
    needsReview: number;
    fail: number;
  };
  regression: Record<string, "PASS" | "FAIL" | "SKIP">;
  freezeHash?: string;
  knownDebt: string[];
  readyToDeploy: boolean;
}
