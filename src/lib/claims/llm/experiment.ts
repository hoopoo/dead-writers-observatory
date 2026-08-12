import { people } from "@/data/people";
import { DeterministicClaimGenerator } from "@/lib/claims/deterministic-generator";
import { buildEvidencePacket } from "@/lib/claims/evidence-packet";
import {
  applyValidation,
  defaultClaimValidator,
} from "@/lib/claims/validator";
import { buildValidatedLLMClaim } from "@/lib/claims/llm/convert";
import { hashEvidencePacket } from "@/lib/claims/llm/hash";
import { assessNoveltyAgainst, dedupeProposals } from "@/lib/claims/llm/novelty";
import {
  createClaimLLMProvider,
  getClaimPromptVersion,
  ClaimLLMProviderUnavailableError,
} from "@/lib/claims/llm/provider";
import {
  findCachedProposalRecord,
  listProposedClaims,
  replaceProposedClaimsForRecord,
  saveProposalRecord,
} from "@/lib/claims/llm/store";
import type {
  LLMClaimExperimentCase,
  ValidatedLLMClaim,
} from "@/lib/claims/llm/types";
import { analyzeQuestion } from "@/lib/question-analysis";
import { createRetriever } from "@/lib/retrieval-mode";
import type { PerspectiveClaim } from "@/types/perspective-claim";

const MAX_PROPOSALS = 6;
const MAX_REVIEW_QUEUE = 5;

function forceModernTransferRules(claim: PerspectiveClaim): PerspectiveClaim {
  if (claim.claimType !== "modern-transfer") return claim;
  return {
    ...claim,
    authorialAttribution: "none",
    historicalTransfer: "explicit",
  };
}

function applyLlmValidatorExtras(
  claim: PerspectiveClaim,
  packet: Parameters<typeof defaultClaimValidator.validate>[1],
  schemaIssues: string[],
): PerspectiveClaim {
  const result = defaultClaimValidator.validate(claim, packet);
  const issues = [...result.issues];

  for (const issue of schemaIssues) {
    if (
      issue === "evidence-id-invalid" ||
      issue === "proposal-schema-invalid" ||
      issue === "external-knowledge-injection" ||
      issue === "writer-stereotype-injection"
    ) {
      issues.push(issue);
    }
  }

  // Stereotype / external knowledge soft traps in claim text
  const text = claim.text;
  if (
    claim.personId.includes("dazai") &&
    /自滅|破滅|恥辱だけで|人間失格そのもの/.test(text) &&
    !packet.evidence.some((e) => /失格|恥|自/.test(e.normalizedMeaning))
  ) {
    issues.push("writer-stereotype-injection");
  }
  if (
    claim.personId.includes("akutagawa") &&
    /発狂|自殺を予見|神経衰弱そのもの/.test(text) &&
    !packet.evidence.some((e) => /神経|不安|死/.test(e.normalizedMeaning))
  ) {
    issues.push("writer-stereotype-injection");
  }
  if (
    claim.personId.includes("soseki") &&
    /個人主義だけが|漱石の本質は個人主義/.test(text)
  ) {
    issues.push("writer-stereotype-injection");
  }

  // Outside-packet biography / death facts
  if (
    /昭和|大正|明治|一九|18\d{2}|19\d{2}|玉川上水|服毒|芥川は自殺|太宰は入水/.test(
      text,
    ) &&
    !packet.evidence.some((e) =>
      /昭和|大正|明治|自殺|死/.test(
        `${e.normalizedMeaning}${e.passageText ?? ""}`,
      ),
    )
  ) {
    issues.push("external-knowledge-injection");
  }

  const unique = Array.from(new Set(issues));
  const allowed =
    result.allowed &&
    !unique.includes("external-knowledge-injection") &&
    !unique.includes("writer-stereotype-injection") &&
    !unique.includes("evidence-id-invalid") &&
    !unique.includes("proposal-schema-invalid");

  return applyValidation(claim, {
    ...result,
    issues: unique,
    allowed,
  });
}

export async function runLlmClaimExperimentCase(args: {
  question: string;
  personId: string;
  fixtureId: string;
  forceRefresh?: boolean;
}): Promise<LLMClaimExperimentCase> {
  const analysis = analyzeQuestion(args.question);
  const { mode, retriever } = createRetriever("deterministic");
  const selected = await retriever.retrieve(args.personId, analysis);
  const { packet } = buildEvidencePacket({
    personId: args.personId,
    analysis,
    selected,
    retrievalMode: mode,
  });
  const packetHash = hashEvidencePacket(packet);

  const deterministic = await new DeterministicClaimGenerator().generate(packet);
  const deterministicClaims = deterministic.map((claim) =>
    applyValidation(claim, defaultClaimValidator.validate(claim, packet)),
  );

  const provider = createClaimLLMProvider();
  const promptVersion = getClaimPromptVersion();

  if (!provider) {
    return {
      fixtureId: args.fixtureId,
      personId: args.personId,
      packet,
      packetHash,
      deterministicClaims,
      llmClaims: [],
      providerUnavailable: true,
    };
  }

  const cached =
    !args.forceRefresh &&
    findCachedProposalRecord({
      evidencePacketHash: packetHash,
      provider: provider.providerName,
      model: provider.modelName,
      promptVersion,
    });

  if (cached) {
    const stored = listProposedClaims({
      fixtureId: args.fixtureId,
      personId: args.personId,
    }).filter((item) => item.claim.promptVersion === promptVersion);
    if (stored.length > 0) {
      return {
        fixtureId: args.fixtureId,
        personId: args.personId,
        packet,
        packetHash,
        deterministicClaims,
        llmClaims: stored,
        record: cached,
      };
    }
  }

  let output;
  try {
    output = await provider.generateStructuredClaims({
      question: args.question,
      questionAnalysis: analysis,
      personId: args.personId,
      personName: people.find((p) => p.id === args.personId)?.name ?? args.personId,
      evidencePacket: packet,
      historicalDistance: packet.historicalDistance,
      promptVersion,
      maxProposals: MAX_PROPOSALS,
    });
  } catch (error) {
    if (error instanceof ClaimLLMProviderUnavailableError) {
      return {
        fixtureId: args.fixtureId,
        personId: args.personId,
        packet,
        packetHash,
        deterministicClaims,
        llmClaims: [],
        providerUnavailable: true,
      };
    }
    throw error;
  }

  const record = saveProposalRecord({
    fixtureId: args.fixtureId,
    personId: args.personId,
    evidencePacketHash: packetHash,
    provider: provider.providerName,
    model: provider.modelName,
    promptVersion,
    temperature: output.temperature,
    rawStructuredOutput: output.rawStructuredOutput,
    usage: output.usage,
  });

  const built: ValidatedLLMClaim[] = [];
  for (const proposal of output.proposals) {
    const base = buildValidatedLLMClaim({
      proposal,
      packet,
      providerName: provider.providerName,
      modelName: provider.modelName,
      promptVersion,
    });
    const withRules = forceModernTransferRules(base.claim);
    const validated = applyLlmValidatorExtras(
      withRules,
      packet,
      base.schemaIssues,
    );
    const novelty = assessNoveltyAgainst(validated, deterministicClaims);
    const experimentStatus = !base.schemaValid
      ? "rejected"
      : validated.allowedInFinalPerspective
        ? "validated"
        : "rejected";
    built.push({
      ...base,
      claim: {
        ...validated,
        experimentStatus,
      },
      novelty,
      experimentStatus,
    });
  }

  // Dedupe among allowed first, then fill review queue up to MAX_REVIEW_QUEUE
  const allowed = built.filter((b) => b.claim.allowedInFinalPerspective);
  const blocked = built.filter((b) => !b.claim.allowedInFinalPerspective);
  const dedupedAllowedIds = new Set(
    dedupeProposals(allowed.map((a) => a.claim)).map((c) => c.id),
  );
  const uniqueAllowed = allowed.filter((a) => dedupedAllowedIds.has(a.claim.id));
  const forQueue = [
    ...uniqueAllowed.slice(0, MAX_REVIEW_QUEUE),
    ...blocked,
  ];
  // Keep all for curator observation of failures; queue preference is first 5 allowed
  const llmClaims = built.map((item) => {
    const inQueue =
      forQueue.findIndex((q) => q.claim.id === item.claim.id) < MAX_REVIEW_QUEUE &&
      item.claim.allowedInFinalPerspective;
    return {
      ...item,
      claim: {
        ...item.claim,
        // annotate via notes in novelty
      },
      novelty: item.novelty
        ? {
            ...item.novelty,
            notes: `${item.novelty.notes ?? ""}${inQueue ? ";review-queue" : ""}`,
          }
        : item.novelty,
    };
  });

  replaceProposedClaimsForRecord({
    recordId: record.id,
    fixtureId: args.fixtureId,
    personId: args.personId,
    items: llmClaims,
  });

  return {
    fixtureId: args.fixtureId,
    personId: args.personId,
    packet,
    packetHash,
    deterministicClaims,
    llmClaims,
    record,
  };
}

export { ClaimLLMProviderUnavailableError };
