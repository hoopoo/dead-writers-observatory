import { PRIORITY_CLAIM_FIXTURES } from "@/lib/claims/approved";
import { people } from "@/data/people";
import {
  listIndependentProseBlindEvaluations,
  mapSideToMode,
  summarizeBlindGate,
} from "@/lib/prose/blind";
import { getPublicPerspectiveMode } from "@/lib/public/mode";
import { validateReleaseConfig } from "@/lib/release/config";
import {
  loadPublicBetaFreeze,
  validateFreezeArtifact,
} from "@/lib/release/freeze";
import type { BlindGateDecision, PublicBetaReadinessV01, PublicModeDecision } from "@/types/release";
import type {
  IndependentProseBlindEvaluation,
  PublicPerspectiveMode,
} from "@/types/public";

export const BLIND_EXPECTED = PRIORITY_CLAIM_FIXTURES.length * people.length;

export function latestBlindByCase(
  evaluations: IndependentProseBlindEvaluation[] = listIndependentProseBlindEvaluations(),
): IndependentProseBlindEvaluation[] {
  const map = new Map<string, IndependentProseBlindEvaluation>();
  for (const row of evaluations) {
    const key = `${row.fixtureId}:${row.personId}`;
    if (!map.has(key)) map.set(key, row);
  }
  return Array.from(map.values());
}

export function decideBlindGate(
  evaluations: IndependentProseBlindEvaluation[] = latestBlindByCase(),
): {
  decision: BlindGateDecision;
  reviewed: number;
  materialMeaning: number;
  attributionUnsafe: number;
  prosePreferred: number;
  skeletonPreferred: number;
  same: number;
  unclear: number;
  readabilityBetter: number;
  readabilitySame: number;
  readabilityWorse: number;
  usefulnessBetter: number;
  usefulnessSame: number;
  usefulnessWorse: number;
  readabilityBetterOrSameRate: number;
  usefulnessBetterOrSameRate: number;
} {
  const gate = summarizeBlindGate(evaluations);
  const reviewed = evaluations.length;
  let prosePreferred = 0;
  let skeletonPreferred = 0;
  let same = 0;
  let unclear = 0;
  let readabilityBetter = 0;
  let readabilitySame = 0;
  let readabilityWorse = 0;
  let usefulnessBetter = 0;
  let usefulnessSame = 0;
  let usefulnessWorse = 0;

  for (const row of evaluations) {
    if (row.preferred === "same") same += 1;
    else if (row.preferred === "unclear") unclear += 1;
    else if (mapSideToMode(row.assignment, row.preferred) === "prose") {
      prosePreferred += 1;
    } else skeletonPreferred += 1;

    const readMode = mapSideToMode(row.assignment, row.feelsMoreReadable);
    if (readMode === "prose") readabilityBetter += 1;
    else if (readMode === "same") readabilitySame += 1;
    else readabilityWorse += 1;

    const useMode = mapSideToMode(row.assignment, row.feelsMoreUseful);
    if (useMode === "prose") usefulnessBetter += 1;
    else if (useMode === "same") usefulnessSame += 1;
    else usefulnessWorse += 1;
  }

  let decision: BlindGateDecision = "INCOMPLETE";
  if (reviewed < BLIND_EXPECTED) decision = "INCOMPLETE";
  else if (gate.gatePass) decision = "PASS";
  else decision = "FAIL";

  return {
    decision,
    reviewed,
    materialMeaning: gate.materialMeaning,
    attributionUnsafe: gate.attributionUnsafe,
    prosePreferred,
    skeletonPreferred,
    same,
    unclear,
    readabilityBetter,
    readabilitySame,
    readabilityWorse,
    usefulnessBetter,
    usefulnessSame,
    usefulnessWorse,
    readabilityBetterOrSameRate:
      reviewed === 0 ? 0 : (readabilityBetter + readabilitySame) / reviewed,
    usefulnessBetterOrSameRate:
      reviewed === 0 ? 0 : (usefulnessBetter + usefulnessSame) / reviewed,
  };
}

export function decidePublicMode(
  evaluations: IndependentProseBlindEvaluation[] = latestBlindByCase(),
): PublicModeDecision {
  const blind = decideBlindGate(evaluations);
  if (blind.decision === "PASS") {
    return {
      recommendedMode: "prose",
      reason:
        "Independent blind gate passed: no material drift, attribution safe, readability/usefulness ≥ 90% better+same.",
      blindGatePassed: true,
      fallbackMode: "skeleton",
    };
  }
  if (blind.decision === "FAIL") {
    return {
      recommendedMode: "skeleton",
      reason:
        "Independent blind gate failed. Public Beta ships with skeleton; prose remains staging-only.",
      blindGatePassed: false,
      fallbackMode: "skeleton",
    };
  }
  return {
    recommendedMode: "skeleton",
    reason:
      "Independent blind check incomplete. Public Beta can ship with skeleton; prose stays staging.",
    blindGatePassed: false,
    fallbackMode: "skeleton",
  };
}

export function computePublicBetaReadiness(args?: {
  qa?: { pass: number; needsReview: number; fail: number; total: number };
  buildOk?: boolean;
}): PublicBetaReadinessV01 {
  const blind = decideBlindGate();
  const modeDecision = decidePublicMode();
  const freeze = loadPublicBetaFreeze();
  const freezeCheck = freeze ? validateFreezeArtifact(freeze) : { ok: false, issues: ["missing freeze"] };
  const config = validateReleaseConfig();

  const blockers: string[] = [];
  if (args?.qa && args.qa.fail > 0) blockers.push(`Release QA FAIL=${args.qa.fail}`);
  if (args?.buildOk === false) blockers.push("build failed");
  if (!freezeCheck.ok) blockers.push(`freeze invalid: ${freezeCheck.issues[0]}`);
  if (!config.ok) blockers.push(`release config: ${config.issues[0]}`);

  const nonBlockingDebt = [
    "portrait missing",
    "share missing",
    "archive small / not complete works",
    "some non-priority fixtures insufficient",
    "Experiment C shelved",
    "retrieval router not implemented",
    "login / history not in v0.1",
  ];
  if (blind.decision !== "PASS") {
    nonBlockingDebt.unshift("prose staging-only until/unless blind PASS");
  }

  const publicMode = modeDecision.recommendedMode;
  const ready =
    blockers.length === 0 &&
    (args?.qa ? args.qa.fail === 0 : true) &&
    freezeCheck.ok;

  return {
    archive: "ready",
    retrieval: "ready",
    claims: "ready",
    distinctiveness: "ready",
    prose: blind.decision === "PASS" ? "ready" : "staging",
    blindCheck:
      blind.decision === "INCOMPLETE"
        ? "pending"
        : "ready",
    publicUX: "ready",
    releaseQA:
      !args?.qa
        ? "pending"
        : args.qa.fail > 0
          ? "blocked"
          : "ready",
    build: args?.buildOk === false ? "blocked" : "ready",
    publicMode,
    blockers,
    nonBlockingDebt,
    readyForPublicBeta: ready,
    status: ready ? "READY TO DEPLOY" : "NOT READY",
  };
}

export function envRecommendedPublicMode(): PublicPerspectiveMode {
  return decidePublicMode().recommendedMode;
}

/** Prefer freeze-informed recommendation; ENV may still override in production. */
export function effectivePublicModeFromDecision(): PublicPerspectiveMode {
  const env = getPublicPerspectiveMode();
  const rec = decidePublicMode().recommendedMode;
  if (process.env.PUBLIC_PERSPECTIVE_MODE === "skeleton" || process.env.PUBLIC_PERSPECTIVE_MODE === "prose") {
    return env;
  }
  return rec;
}
