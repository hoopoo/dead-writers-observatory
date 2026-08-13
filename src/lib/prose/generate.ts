import { buildExperimentBProseInput } from "@/lib/prose/input";
import {
  createProseLLMProvider,
  getProsePromptVersion,
} from "@/lib/prose/provider";
import {
  assertProseInputApprovedOnly,
  filterAllowedProse,
  validateProseOutput,
} from "@/lib/prose/validator";
import { findCachedProse, saveProseRecord } from "@/lib/prose/store";
import type {
  EvidenceBoundedProseInput,
  EvidenceBoundedProseOutput,
  ProseGenerationRecord,
  ProseLLMProvider,
  ProseValidationResult,
} from "@/types/prose";
import type { PerspectiveClaim } from "@/types/perspective-claim";

export async function repairProseOnce(args: {
  input: EvidenceBoundedProseInput;
  output: EvidenceBoundedProseOutput;
  validation: ProseValidationResult;
}): Promise<EvidenceBoundedProseOutput> {
  const claimMap = new Map(
    args.input.approvedClaims.map((c) => [c.id, c] as const),
  );
  const blocked = new Set(
    args.validation.sentenceResults
      .filter((r) => !r.allowed)
      .map((r) => r.sentenceId),
  );

  const sections = args.output.sections
    .map((section) => ({
      ...section,
      sentences: section.sentences
        .filter((s) => !blocked.has(s.id))
        .map((s) => {
          // Pull text closer to first claim when light issues remain
          const claim = claimMap.get(s.claimIds[0] ?? "");
          if (!claim) return s;
          if (s.transformationType === "transition") return s;
          return {
            ...s,
            text: claim.text,
            transformationType: "verbatim-claim" as const,
            introducesNewMeaning: false,
          };
        }),
    }))
    .filter((s) => s.sentences.length > 0);

  // If coverage dropped, reinstate omitted claims as verbatim
  const used = new Set(sections.flatMap((s) => s.sentences.flatMap((x) => x.claimIds)));
  const omitted = args.input.approvedClaims.filter((c) => !used.has(c.id));
  for (const claim of omitted) {
    const type =
      claim.claimType === "returned-question"
        ? "returned-question"
        : claim.claimType === "modern-transfer"
          ? "connection"
          : claim.claimType === "cross-evidence-synthesis"
            ? "across-sources"
            : "archive";
    let section = sections.find((s) => s.type === type);
    if (!section) {
      section = { type, sentences: [] };
      sections.push(section);
    }
    if (
      type === "returned-question" &&
      section.sentences.length >= 1
    ) {
      continue;
    }
    const id = `repair-${claim.id}`;
    let text = claim.text;
    if (
      claim.historicalTransfer === "explicit" &&
      !/(現在の問い|いまの問い|接続|現代への|観点を現在)/.test(text)
    ) {
      text = `この観点を現在の問いへ接続すると、${text}`;
    }
    section.sentences.push({
      id,
      text,
      claimIds: [claim.id],
      transformationType: text === claim.text ? "verbatim-claim" : "light-edit",
      introducesNewMeaning: false,
    });
  }

  return {
    personId: args.input.personId,
    sections,
    sentenceMappings: sections.flatMap((sec) =>
      sec.sentences.map((s) => ({
        sentenceId: s.id,
        claimIds: s.claimIds,
        relation:
          s.claimIds.length > 1
            ? ("merged-restatement" as const)
            : s.transformationType === "transition"
              ? ("transition-only" as const)
              : ("direct-restatement" as const),
        support: "supported" as const,
      })),
    ),
    editorMetadata: {
      ...args.output.editorMetadata,
      repaired: true,
    },
  };
}

export async function generateProse(args: {
  question: string;
  personId: string;
  fixtureId: string;
  provider?: ProseLLMProvider;
  useCache?: boolean;
  allowRepair?: boolean;
}): Promise<{
  input: EvidenceBoundedProseInput;
  record: ProseGenerationRecord;
  userFacing: EvidenceBoundedProseOutput;
  repaired: boolean;
}> {
  const input = await buildExperimentBProseInput({
    question: args.question,
    personId: args.personId,
    fixtureId: args.fixtureId,
  });
  assertProseInputApprovedOnly(input);

  const provider = args.provider ?? createProseLLMProvider();
  const promptVersion = getProsePromptVersion();
  const useCache = args.useCache !== false;

  if (useCache) {
    const cached = findCachedProse({
      inputHash: input.inputHash,
      provider: provider.providerName,
      model: provider.modelName,
      promptVersion,
    });
    if (cached) {
      return {
        input,
        record: cached,
        userFacing: filterAllowedProse(cached.output, cached.validation),
        repaired: Boolean(cached.output.editorMetadata.repaired),
      };
    }
  }

  let output = await provider.edit(input);
  let validation = validateProseOutput(input, output, "pending");
  let repaired = false;

  if (!validation.allowed && args.allowRepair !== false) {
    output = await repairProseOnce({ input, output, validation });
    validation = validateProseOutput(input, output, "pending");
    repaired = true;
  }

  const record = saveProseRecord({
    fixtureId: args.fixtureId,
    personId: args.personId,
    experimentId: "B",
    inputHash: input.inputHash,
    provider: provider.providerName,
    model: provider.modelName,
    promptVersion,
    output,
    validation,
  });

  return {
    input,
    record,
    userFacing: filterAllowedProse(record.output, record.validation),
    repaired,
  };
}

export function proseClaimsUsed(
  output: EvidenceBoundedProseOutput,
  claims: PerspectiveClaim[],
): PerspectiveClaim[] {
  const ids = new Set(output.sections.flatMap((s) => s.sentences.flatMap((x) => x.claimIds)));
  return claims.filter((c) => ids.has(c.id));
}
