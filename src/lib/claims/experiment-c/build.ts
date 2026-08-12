import { buildStagingPerspectiveSkeleton } from "@/lib/claims/approved";
import {
  analyzeWriterDiversity,
  buildWriterFingerprint,
} from "@/lib/claims/distinctiveness";
import { extractConcepts } from "@/lib/claims/redundancy";
import { buildApprovedClaimPool } from "@/lib/claims/selector";
import { isLlmStagingEligible, isTrueLlmAddedValue } from "@/lib/claims/staging";
import { getClaimHumanEvaluation } from "@/lib/claims/human-eval";
import { runLlmClaimExperimentCase } from "@/lib/claims/llm/experiment";
import { textSimilarity } from "@/lib/claims/llm/novelty";
import type {
  ExperimentClaimPool,
  PerspectiveExperimentComparison,
  PerspectiveSetSummary,
} from "@/lib/claims/experiment-c/types";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";
import { getSourceById } from "@/data/sources";

export async function buildExperimentClaimPool(args: {
  experimentId: "B" | "C";
  question: string;
  personId: string;
  fixtureId: string;
  forceRefresh?: boolean;
}): Promise<{
  pool: ExperimentClaimPool;
  skeleton: EvidenceBoundedPerspectiveSkeleton;
  providerUnavailable?: boolean;
}> {
  const retrievalMode =
    args.experimentId === "C" ? "neural-hybrid" : "deterministic";
  const caseResult = await runLlmClaimExperimentCase({
    question: args.question,
    personId: args.personId,
    fixtureId: args.fixtureId,
    experimentId: args.experimentId,
    retrievalMode,
    forceRefresh: args.forceRefresh,
  });

  const poolBase = buildApprovedClaimPool({
    personId: args.personId,
    question: args.question,
    deterministicClaims: caseResult.deterministicClaims,
    llmClaims: caseResult.llmClaims.map((i) => i.claim),
  });

  // Enforce C evidence isolation: drop LLM claims whose evidence is not in packet
  const packetIds = new Set(caseResult.packet.evidence.map((e) => e.id));
  const llmHumanApprovedClaims = poolBase.llmHumanApproved.filter((claim) =>
    claim.evidenceIds.every((id) => packetIds.has(id)),
  );

  const pool: ExperimentClaimPool = {
    experimentId: args.experimentId,
    retrievalMode,
    personId: args.personId,
    question: args.question,
    deterministicClaims: poolBase.deterministic,
    llmHumanApprovedClaims,
    evidencePacketHash: caseResult.packetHash,
    packet: caseResult.packet,
  };

  const skeleton = buildStagingPerspectiveSkeleton({
    personId: args.personId,
    question: args.question,
    deterministicClaims: caseResult.deterministicClaims,
    llmClaims: caseResult.llmClaims
      .map((i) => i.claim)
      .filter((claim) => claim.evidenceIds.every((id) => packetIds.has(id))),
  });

  return {
    pool,
    skeleton,
    providerUnavailable: caseResult.providerUnavailable,
  };
}

function sourceIdsFromPacket(packet: ExperimentClaimPool["packet"]): string[] {
  return Array.from(new Set(packet.evidence.map((e) => e.sourceId)));
}

function sourceTitle(id: string): string {
  return getSourceById(id)?.title ?? id;
}

export function summarizePerspectiveSet(args: {
  experimentId: "B" | "C";
  pool: ExperimentClaimPool;
  skeleton: EvidenceBoundedPerspectiveSkeleton;
}): PerspectiveSetSummary {
  const diversity = analyzeWriterDiversity(
    args.pool.personId,
    args.skeleton.claims,
  );
  return {
    experimentId: args.experimentId,
    retrievalMode: args.pool.retrievalMode,
    claimIds: args.skeleton.claimIds,
    claimTexts: args.skeleton.claims.map((c) => c.text),
    claimOrigins: args.skeleton.claims.map((c) =>
      c.generatorOrigin === "llm" ? "llm" : "deterministic",
    ),
    sourceIds: sourceIdsFromPacket(args.pool.packet),
    themes: buildWriterFingerprint(args.pool.personId, args.skeleton.claims)
      .dominantThemes,
    returnedQuestions: args.skeleton.sections.returnedQuestion,
    internalDiversityScore: diversity.score,
    dominantTheme: diversity.dominantTheme,
    dominantThemeRatio: diversity.dominantThemeRatio,
    redundancyCount: diversity.redundancyCount,
    availability: args.skeleton.availability,
  };
}

export function comparePerspectiveExperiments(args: {
  fixtureId: string;
  personId: string;
  b: { pool: ExperimentClaimPool; skeleton: EvidenceBoundedPerspectiveSkeleton };
  c: { pool: ExperimentClaimPool; skeleton: EvidenceBoundedPerspectiveSkeleton };
}): PerspectiveExperimentComparison {
  const experimentB = summarizePerspectiveSet({
    experimentId: "B",
    pool: args.b.pool,
    skeleton: args.b.skeleton,
  });
  const experimentC = summarizePerspectiveSet({
    experimentId: "C",
    pool: args.c.pool,
    skeleton: args.c.skeleton,
  });

  const bSources = new Set(experimentB.sourceIds);
  const cSources = new Set(experimentC.sourceIds);
  const addedSources = [...cSources].filter((s) => !bSources.has(s)).map(sourceTitle);
  const removedSources = [...bSources]
    .filter((s) => !cSources.has(s))
    .map(sourceTitle);
  const unchangedSources = [...bSources]
    .filter((s) => cSources.has(s))
    .map(sourceTitle);

  const bClaims = new Map(
    args.b.skeleton.claims.map((c) => [c.id, c] as const),
  );
  const cClaims = new Map(
    args.c.skeleton.claims.map((c) => [c.id, c] as const),
  );
  const addedClaims: string[] = [];
  const removedClaims: string[] = [];
  const equivalentClaims: string[] = [];

  for (const [id, claim] of cClaims) {
    if (bClaims.has(id)) {
      equivalentClaims.push(claim.text);
      continue;
    }
    const match = [...bClaims.values()].find(
      (b) => textSimilarity(b.text, claim.text) >= 0.55,
    );
    if (match) equivalentClaims.push(claim.text);
    else addedClaims.push(claim.text);
  }
  for (const [id, claim] of bClaims) {
    if (cClaims.has(id)) continue;
    const match = [...cClaims.values()].find(
      (c) => textSimilarity(c.text, claim.text) >= 0.55,
    );
    if (!match) removedClaims.push(claim.text);
  }

  const bThemes = new Set(experimentB.themes);
  const cThemes = new Set(experimentC.themes);
  const changedThemes = [
    ...[...cThemes].filter((t) => !bThemes.has(t)),
    ...[...bThemes].filter((t) => !cThemes.has(t)),
  ];

  return {
    fixtureId: args.fixtureId,
    personId: args.personId,
    experimentB,
    experimentC,
    retrievalEvidenceChanged:
      args.b.pool.evidencePacketHash !== args.c.pool.evidencePacketHash,
    addedSources,
    removedSources,
    unchangedSources,
    addedClaims,
    removedClaims,
    equivalentClaims,
    changedThemes,
    distinctivenessDelta: 0, // filled at fixture level
    internalDiversityDelta:
      experimentC.internalDiversityScore - experimentB.internalDiversityScore,
  };
}

export function countCOnlyTrueAddedValue(args: {
  bClaims: { id: string; text: string }[];
  cClaims: Array<{
    claim: import("@/types/perspective-claim").PerspectiveClaim;
  }>;
}): number {
  let count = 0;
  for (const item of args.cClaims) {
    if (item.claim.generatorOrigin !== "llm") continue;
    const evaluation = getClaimHumanEvaluation({ claimId: item.claim.id });
    if (!isTrueLlmAddedValue(item.claim, evaluation)) continue;
    const inB = args.bClaims.some(
      (b) =>
        b.id === item.claim.id ||
        textSimilarity(b.text, item.claim.text) >= 0.55,
    );
    if (!inB) count += 1;
  }
  return count;
}

export function deathEvidenceSaturation(
  packet: ExperimentClaimPool["packet"],
  fixtureId: string,
): boolean {
  if (fixtureId !== "q10") return false;
  if (packet.evidence.length === 0) return false;
  const deathish = packet.evidence.filter((e) =>
    /死|不安|破滅|神経|恐れ|自殺/.test(
      `${e.normalizedMeaning}${e.themes.join("")}`,
    ),
  ).length;
  return deathish / packet.evidence.length >= 0.75;
}

export function listStagingEligibleFromPool(pool: ExperimentClaimPool) {
  return pool.llmHumanApprovedClaims.filter((claim) =>
    isLlmStagingEligible(claim, getClaimHumanEvaluation({ claimId: claim.id }))
      .ok,
  );
}

export { extractConcepts };
