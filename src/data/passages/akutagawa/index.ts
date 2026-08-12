import type { SourcePassage } from "@/types/source-passage";
import { shujuPassages } from "./shuju-no-kotoba";
import { ahouPassages } from "./aru-aho-no-issho";
import { hagurumaPassages } from "./haguruma";

const placeholderPassages: SourcePassage[] = [
  {
    id: "pass-akutagawa-ahou-02",
    sourceId: "src-akutagawa-ahou",
    personId: "person-akutagawa",
    locator: { section: "modernity-anxiety", anchor: "placeholder-02" },
    voiceType: "autobiographical",
    isAuthorDirectStatement: true,
    provenanceConfidence: "medium",
    verificationStatus: "placeholder",
    notes: "近代的生活と不安。verified text 未投入。",
  },
  {
    id: "pass-akutagawa-hagu-02",
    sourceId: "src-akutagawa-haguruma",
    personId: "person-akutagawa",
    locator: { section: "reality-fatigue", anchor: "placeholder-02" },
    voiceType: "narrator",
    speaker: "語り手",
    isAuthorDirectStatement: false,
    provenanceConfidence: "low",
    verificationStatus: "placeholder",
    notes: "現実感の揺らぎ。自殺説明への単純化を禁止。",
  },
];

export const akutagawaPassages: SourcePassage[] = [
  ...shujuPassages,
  ...ahouPassages,
  ...hagurumaPassages,
  ...placeholderPassages,
];
