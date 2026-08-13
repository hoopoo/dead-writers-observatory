"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPassageById } from "@/data/passages";
import { evaluatePassageApproveGate } from "@/lib/review/approve-gate";
import { upsertRetrievalHumanEvaluation } from "@/lib/retrieval-human-eval";
import { upsertClaimHumanEvaluation } from "@/lib/claims/human-eval";
import { sqliteReviewRepository } from "@/lib/review/sqlite-repository";
import { canTransitionReviewStatus } from "@/lib/review/transitions";
import {
  DEFAULT_REVIEW_ACTOR,
  type PassageReview,
  type ReviewStatus,
} from "@/types/review";
import { isCuratorEnabled } from "@/lib/curator-env";
import type {
  CandidateEvaluationMode,
  RetrievalHumanEvaluation,
  RetrievalHumanEvaluationInput,
} from "@/types/embedding";
import type {
  ClaimHumanEvaluation,
  ClaimHumanEvaluationInput,
} from "@/types/perspective-claim";
import type { ProseHumanEvaluation } from "@/types/prose";
import { saveProseHumanEvaluation } from "@/lib/prose/store";
import type { IndependentProseBlindEvaluation } from "@/types/public";
import {
  blindAssignmentFor,
  saveIndependentProseBlindEvaluation,
} from "@/lib/prose/blind";

export async function loginCurator(token: string, nextPath: string) {
  if (!isCuratorEnabled()) {
    return { error: "Curator is disabled" };
  }
  const expected = process.env.CURATOR_TOKEN;
  if (!expected) {
    redirect(nextPath.startsWith("/curator") ? nextPath : "/curator");
  }
  if (token !== expected) {
    return { error: "Invalid token" };
  }
  const jar = await cookies();
  jar.set("curator_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect(nextPath.startsWith("/curator") ? nextPath : "/curator");
}

export async function updatePassageReviewAction(input: {
  passageId: string;
  reviewStatus: ReviewStatus;
  notes?: string;
}): Promise<{ ok: true; review: PassageReview } | { ok: false; error: string }> {
  if (!isCuratorEnabled()) {
    return { ok: false, error: "Curator is disabled" };
  }

  const passage = getPassageById(input.passageId);
  if (!passage) return { ok: false, error: "Passage not found" };

  const current =
    (await sqliteReviewRepository.getPassageReview(input.passageId)) ?? null;
  const from = current?.reviewStatus ?? "pending";
  if (!canTransitionReviewStatus(from, input.reviewStatus)) {
    return {
      ok: false,
      error: `Invalid transition: ${from} → ${input.reviewStatus}`,
    };
  }

  const checks =
    input.reviewStatus === "approved"
      ? {
          textVerified: true,
          locatorVerified: true,
          voiceVerified: true,
          authorialDistanceVerified: true,
          sourceRelationshipVerified: true,
          fragmentMeaningVerified: true,
        }
      : current?.checks;

  if (input.reviewStatus === "approved") {
    const gate = evaluatePassageApproveGate(
      input.passageId,
      checks ?? {
        textVerified: false,
        locatorVerified: false,
        voiceVerified: false,
        authorialDistanceVerified: false,
        sourceRelationshipVerified: false,
        fragmentMeaningVerified: false,
      },
    );
    if (!gate.ok) {
      return { ok: false, error: `APPROVE blocked: ${gate.reasons.join("; ")}` };
    }
  }

  try {
    const review = await sqliteReviewRepository.updatePassageReview(
      input.passageId,
      {
        reviewStatus: input.reviewStatus,
        checks,
        notes: input.notes,
      },
      DEFAULT_REVIEW_ACTOR,
    );
    revalidatePath(`/curator/passages/${input.passageId}`);
    revalidatePath("/curator");
    revalidatePath("/curator/retrieval");
    return { ok: true, review };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Update failed",
    };
  }
}

export async function saveRetrievalHumanEvaluationAction(
  input: RetrievalHumanEvaluationInput,
): Promise<
  | { ok: true; evaluation: RetrievalHumanEvaluation }
  | { ok: false; error: string }
> {
  if (!isCuratorEnabled()) {
    return { ok: false, error: "Curator is disabled" };
  }

  const allowed: CandidateEvaluationMode[] = [
    "local-semantic",
    "neural-semantic",
    "neural-hybrid",
  ];
  if (!allowed.includes(input.candidateMode)) {
    return { ok: false, error: "Invalid candidate mode" };
  }
  if (!["better", "same", "worse", "unclear"].includes(input.verdict)) {
    return { ok: false, error: "Invalid verdict" };
  }

  try {
    const evaluation = upsertRetrievalHumanEvaluation(
      input,
      DEFAULT_REVIEW_ACTOR,
    );
    revalidatePath("/curator/retrieval");
    revalidatePath("/curator");
    return { ok: true, evaluation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}

export async function saveClaimHumanEvaluationAction(
  input: ClaimHumanEvaluationInput,
): Promise<
  | { ok: true; evaluation: ClaimHumanEvaluation }
  | { ok: false; error: string }
> {
  if (!isCuratorEnabled()) {
    return { ok: false, error: "Curator is disabled" };
  }
  const evidenceOk = [
    "supported",
    "too-strong",
    "too-weak",
    "misattributed",
    "unclear",
  ].includes(input.evidenceVerdict);
  const usefulnessOk = [
    "useful",
    "obvious",
    "not-useful",
    "surprising-but-defensible",
    "unclear",
  ].includes(input.usefulnessVerdict);
  const strengthOk = [
    "appropriate",
    "too-cautious",
    "too-certain",
    "unclear",
  ].includes(input.strengthVerdict);
  const noveltyOk =
    input.noveltyVerdict === undefined ||
    [
      "new-angle",
      "useful-rephrase",
      "duplicate",
      "stereotype",
      "unclear",
    ].includes(input.noveltyVerdict);
  if (!evidenceOk || !usefulnessOk || !strengthOk || !noveltyOk) {
    return { ok: false, error: "Invalid verdict values" };
  }
  try {
    const evaluation = upsertClaimHumanEvaluation(
      input,
      DEFAULT_REVIEW_ACTOR,
    );
    revalidatePath("/curator/claims");
    revalidatePath("/curator/claim-experiments");
    revalidatePath("/curator/perspectives");
    revalidatePath("/curator");
    return { ok: true, evaluation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}

export async function saveProseHumanEvaluationAction(input: {
  proseId: string;
  fixtureId: string;
  personId: string;
  fidelity: ProseHumanEvaluation["fidelity"];
  readability: ProseHumanEvaluation["readability"];
  usefulness: ProseHumanEvaluation["usefulness"];
  distinctiveness: ProseHumanEvaluation["distinctiveness"];
  notes?: string;
}): Promise<
  | { ok: true; evaluation: ProseHumanEvaluation }
  | { ok: false; error: string }
> {
  if (!isCuratorEnabled()) {
    return { ok: false, error: "Curator is disabled" };
  }
  const fidelityOk = [
    "preserved",
    "minor-drift",
    "major-drift",
    "unclear",
  ].includes(input.fidelity);
  const triOk = (v: string) =>
    ["better", "same", "worse", "unclear"].includes(v);
  const distOk = ["preserved", "weakened", "lost", "unclear"].includes(
    input.distinctiveness,
  );
  if (
    !fidelityOk ||
    !triOk(input.readability) ||
    !triOk(input.usefulness) ||
    !distOk
  ) {
    return { ok: false, error: "Invalid prose evaluation values" };
  }
  try {
    const evaluation = saveProseHumanEvaluation({
      ...input,
      reviewer: DEFAULT_REVIEW_ACTOR,
    });
    revalidatePath("/curator/prose");
    return { ok: true, evaluation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}

export async function saveProseBlindEvaluationAction(input: {
  fixtureId: string;
  personId: string;
  preferred: IndependentProseBlindEvaluation["preferred"];
  meaningDifference: IndependentProseBlindEvaluation["meaningDifference"];
  attributionSafe: IndependentProseBlindEvaluation["attributionSafe"];
  feelsMoreReadable: IndependentProseBlindEvaluation["feelsMoreReadable"];
  feelsMoreUseful: IndependentProseBlindEvaluation["feelsMoreUseful"];
  notes?: string;
}): Promise<
  | { ok: true; evaluation: IndependentProseBlindEvaluation }
  | { ok: false; error: string }
> {
  if (!isCuratorEnabled()) {
    return { ok: false, error: "Curator is disabled" };
  }
  const preferredOk = ["a", "b", "same", "unclear"].includes(input.preferred);
  const meaningOk = ["none", "minor", "material", "unclear"].includes(
    input.meaningDifference,
  );
  const safeOk = ["yes", "no", "unclear"].includes(input.attributionSafe);
  const triOk = (v: string) => ["a", "b", "same"].includes(v);
  if (
    !preferredOk ||
    !meaningOk ||
    !safeOk ||
    !triOk(input.feelsMoreReadable) ||
    !triOk(input.feelsMoreUseful)
  ) {
    return { ok: false, error: "Invalid blind evaluation values" };
  }
  try {
    const evaluation = saveIndependentProseBlindEvaluation({
      ...input,
      assignment: blindAssignmentFor(input.fixtureId, input.personId),
      reviewer: DEFAULT_REVIEW_ACTOR,
    });
    revalidatePath("/curator/prose-blind");
    revalidatePath("/curator");
    return { ok: true, evaluation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Save failed",
    };
  }
}
