import type { SourcePassage } from "@/types/source-passage";
import { individualismPassages } from "./watashi-no-kojinshugi";
import { garasudoPassages } from "./garasudo-no-uchi";
import { kokoroPassages } from "./kokoro";

const placeholderPassages: SourcePassage[] = [
  {
    id: "pass-soseki-gara-02",
    sourceId: "src-soseki-garasudo",
    personId: "person-soseki",
    locator: { section: "aging-memory", anchor: "placeholder-02" },
    voiceType: "essayistic",
    isAuthorDirectStatement: true,
    provenanceConfidence: "medium",
    verificationStatus: "placeholder",
    notes: "記憶・老い・孤独。verified text 未投入。",
  },
  {
    id: "pass-soseki-kokoro-02",
    sourceId: "src-soseki-kokoro",
    personId: "person-soseki",
    locator: { chapter: "先生と遺書", section: "guilt", anchor: "placeholder-02" },
    voiceType: "fictional_character",
    speaker: "先生",
    isAuthorDirectStatement: false,
    provenanceConfidence: "medium",
    verificationStatus: "placeholder",
    notes: "登場人物の視点。作者思想への直結を禁止。",
  },
  {
    id: "pass-soseki-kokoro-03",
    sourceId: "src-soseki-kokoro",
    personId: "person-soseki",
    locator: { chapter: "先生と遺書", section: "money-modernity", anchor: "placeholder-03" },
    voiceType: "narrator",
    speaker: "語り手／構成された語り",
    isAuthorDirectStatement: false,
    provenanceConfidence: "low",
    verificationStatus: "placeholder",
    notes: "金銭・近代的関係の主題。verified text 未投入。",
  },
];

export const sosekiPassages: SourcePassage[] = [
  ...individualismPassages,
  ...garasudoPassages,
  ...kokoroPassages,
  ...placeholderPassages,
];
