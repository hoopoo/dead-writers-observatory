import { createHash } from "node:crypto";
import { people } from "@/data/people";
import { generateClaimsForQuestion } from "@/lib/claims";
import { buildStagingPerspectiveSkeleton } from "@/lib/claims/approved";
import { listProposedClaims } from "@/lib/claims/llm/store";
import type {
  EvidenceBoundedProseInput,
  ProseInputProvenance,
} from "@/types/prose";
import type { PerspectiveClaim } from "@/types/perspective-claim";

function hashPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export function hashProseInput(args: {
  personId: string;
  question: string;
  claimIds: string[];
  claimTexts: string[];
}): string {
  return hashPayload(
    JSON.stringify({
      experimentId: "B",
      personId: args.personId,
      question: args.question,
      claimIds: args.claimIds,
      claimTexts: args.claimTexts,
    }),
  );
}

export async function buildExperimentBProseInput(args: {
  question: string;
  personId: string;
  fixtureId: string;
}): Promise<EvidenceBoundedProseInput> {
  const det = await generateClaimsForQuestion({
    question: args.question,
    personId: args.personId,
    fixtureId: args.fixtureId,
    retrievalMode: "deterministic",
  });
  const llm = listProposedClaims({
    fixtureId: args.fixtureId,
    personId: args.personId,
    experimentId: "B",
    retrievalMode: "deterministic",
  }).map((item) => item.claim);

  const skeleton = buildStagingPerspectiveSkeleton({
    personId: args.personId,
    question: args.question,
    deterministicClaims: det.claims,
    llmClaims: llm,
  });

  const approvedClaims: PerspectiveClaim[] = skeleton.claims;
  const provenance: ProseInputProvenance[] = approvedClaims.map((claim) => {
    const linked = det.packet.evidence.filter((e) =>
      claim.evidenceIds.includes(e.id),
    );
    return {
      claimId: claim.id,
      evidenceIds: claim.evidenceIds,
      sourceIds: Array.from(new Set(linked.map((e) => e.sourceId))),
      claimType: claim.claimType,
      supportStatus: claim.supportStatus,
      authorialAttribution: claim.authorialAttribution,
      interpretationDistance: claim.interpretationDistance,
      historicalTransfer: claim.historicalTransfer,
    };
  });

  return {
    personId: args.personId,
    question: args.question,
    experimentId: "B",
    skeleton,
    approvedClaims,
    historicalDistance: det.packet.historicalDistance,
    provenance,
    inputHash: hashProseInput({
      personId: args.personId,
      question: args.question,
      claimIds: approvedClaims.map((c) => c.id),
      claimTexts: approvedClaims.map((c) => c.text),
    }),
  };
}

export function personName(personId: string): string {
  return people.find((p) => p.id === personId)?.name ?? personId;
}
