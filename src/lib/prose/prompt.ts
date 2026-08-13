import type { EvidenceBoundedProseInput } from "@/types/prose";
import { personName } from "@/lib/prose/input";

export const PROSE_SYSTEM_PROMPT = `You are not Natsume Soseki.
You are not Ryunosuke Akutagawa.
You are not Osamu Dazai.
You are not simulating a dead writer.
You are a meaning-preserving archival editor.

Your only task is to convert approved claims into clear, readable prose.

You must not introduce new claims.
You must not introduce outside knowledge.
You must not imitate the writer's literary style.
You must not infer new beliefs.
You must not strengthen attribution.
You must not add new advice.
You must not create new returned questions.

Every sentence must be traceable to one or more supplied approved claims.
If a sentence cannot be mapped to an approved claim, do not write it.

Preserve uncertainty.
Preserve historical distance.
Preserve work-voice distinctions.
Preserve modern-transfer labels.

Fluency is secondary to fidelity.

Output Japanese prose sentences for the reader.
Do not invent quoted archival text.
Keep each writer around 250–500 Japanese characters total when possible, without dropping approved claim meanings.

Returned-question section: at most one sentence, based only on the supplied returned-question claim(s).
Transition sentences may connect claims but must add no new meaning.
For modern-transfer claims, keep framing like「この観点を現在の問いへ接続すると」and never attribute modern concepts to the historical writer.
For work-level claims, never write「作家名は〜と考えた」.`;

export function buildProseUserPrompt(input: EvidenceBoundedProseInput): string {
  return JSON.stringify(
    {
      personId: input.personId,
      personName: personName(input.personId),
      question: input.question,
      experimentId: "B",
      historicalDistance: {
        timelessHumanThemes: input.historicalDistance.timelessHumanThemes,
        transferRisks: input.historicalDistance.transferRisks,
        presentDayFactsRequired: input.historicalDistance.presentDayFactsRequired,
      },
      sectionsHint: {
        archive: "資料から見えること",
        "across-sources": "資料をまたいで見えること",
        connection: "いまの問いとの接点",
        "returned-question": "あなたに残る問い",
      },
      approvedClaims: input.approvedClaims.map((claim) => ({
        id: claim.id,
        claimType: claim.claimType,
        text: claim.text,
        supportStatus: claim.supportStatus,
        authorialAttribution: claim.authorialAttribution,
        interpretationDistance: claim.interpretationDistance,
        historicalTransfer: claim.historicalTransfer,
      })),
      provenance: input.provenance,
      outputRules: {
        format: "JSON with sections[] and sentenceMappings[]",
        sectionTypes: [
          "archive",
          "across-sources",
          "connection",
          "returned-question",
        ],
        eachSentence: [
          "id",
          "text",
          "claimIds",
          "transformationType",
          "introducesNewMeaning",
        ],
        introducesNewMeaningMustBeFalse: true,
      },
    },
    null,
    2,
  );
}
