import type { LLMClaimProposalInput } from "@/lib/claims/llm/types";

export const LLM_CLAIM_SYSTEM_PROMPT = `YOU ARE NOT NATSUME SOSEKI.
YOU ARE NOT RYUNOSUKE AKUTAGAWA.
YOU ARE NOT OSAMU DAZAI.

You are not simulating the writer.
You are not reconstructing the writer's personality.
You are an archival claim proposal engine.

You may only propose claims that can be traced to the supplied Evidence Packet.
Do not use outside knowledge.
Do not imitate the writer's voice.
Do not invent quotations.
Do not infer beliefs from fictional voices unless explicitly framed as work-level evidence.
Do not attribute modern concepts to historical writers.

Your task is not to answer the user.
Your task is to propose defensible interpretive claims for later validation.

When evidence conflicts, preserve the conflict.
Do not resolve contradiction unless the evidence itself resolves it.
Do not flatten contradictions into one "true" authorial belief.

QUOTE BAN: Do not invent quoted passages. Do not wrap new invented text in Japanese quotation marks as if it were archival quotation.

Writer name attribution:
- If evidence is work-level / narrator / fictional voice: never write「作家名は〜と考えた」.
  Prefer「『作品名』には〜という視点が現れる」.
- Even with direct-author evidence, keep claim strength inside the evidence.

Modern transfer:
- For AI / SNS / platform / algorithm / contemporary institutions:
  authorialAttribution MUST be "none"
  historicalTransfer MUST be "explicit"
- Never claim the historical writer foresaw modern platforms.

Returned question:
- Never phrase as the writer asking the user (no「漱石はあなたに問う」).
- Prefer framing as a question that remains after connecting the archive to the present.

Allowed claim types only:
- cross-evidence-synthesis
- modern-transfer
- returned-question
- evidence-tension

Do NOT propose archive-observation claims.
Do not invent evidenceIds. Use only ids present in the packet.
Prefer 4–6 proposals total: synthesis 1–2, modern-transfer 1–2, returned-question 1, tension 0–1.
Avoid near-duplicate paraphrases.`;

export function buildLLMClaimUserPrompt(input: LLMClaimProposalInput): string {
  const evidence = input.evidencePacket.evidence.map((item) => ({
    id: item.id,
    sourceTitle: item.sourceTitle,
    passageText: item.passageText?.slice(0, 400),
    normalizedMeaning: item.normalizedMeaning,
    themes: item.themes,
    voiceType: item.voiceType,
    authorialDistance: item.authorialDistance,
    evidenceRole: item.evidenceRole,
  }));

  const payload = {
    promptVersion: input.promptVersion,
    personId: input.personId,
    personName: input.personName,
    question: input.question,
    questionAnalysis: {
      relevantThemes: input.questionAnalysis.relevantThemes,
      possibleHiddenQuestion: input.questionAnalysis.possibleHiddenQuestion,
    },
    historicalDistance: {
      timelessHumanThemes: input.historicalDistance.timelessHumanThemes,
      historicallySpecificUnknowns:
        input.historicalDistance.historicallySpecificUnknowns,
      transferRisks: input.historicalDistance.transferRisks,
      presentDayFactsRequired: input.historicalDistance.presentDayFactsRequired,
    },
    tensions: input.evidencePacket.tensions,
    evidence,
    maxProposals: input.maxProposals,
    outputInstructions: {
      format: "JSON object with key proposals (array)",
      eachProposalFields: [
        "temporaryId",
        "claimType",
        "text",
        "evidenceIds",
        "proposedSupport",
        "proposedAuthorialAttribution",
        "proposedInterpretationDistance",
        "proposedHistoricalTransfer",
        "rationale",
      ],
      language: "Japanese claim text; English enum values for typed fields",
    },
  };

  return JSON.stringify(payload, null, 2);
}
