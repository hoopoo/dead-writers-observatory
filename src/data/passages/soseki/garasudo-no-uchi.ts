import type { SourcePassage } from "@/types/source-passage";
export const garasudoPassages: SourcePassage[] = [
  {
    id: "pass-soseki-gara-01",
    sourceId: "src-soseki-garasudo",
    personId: "person-soseki",
    text: `硝子戸の中から外を見渡すと、霜除をした芭蕉だの、赤い実の結った梅もどきの枝だの、無遠慮に直立した電信柱だのがすぐ眼に着くが、その他にこれと云って数え立てるほどのものはほとんど視線に入って来ない。書斎にいる私の眼界は極めて単調でそうしてまた極めて狭いのである。`,
    locator: { chapter: "一", anchor: "aozora-760-opening" },
    voiceType: "autobiographical",
    isAuthorDirectStatement: true,
    provenanceConfidence: "high",
    verificationStatus: "verified",
    verification: {
      sourceUrl: "https://www.aozora.gr.jp/cards/000148/files/760_14940.html",
      checkedAgainst: "青空文庫 XHTML（新字新仮名）760_14940.html",
      checkedAt: "2026-08-12",
      checkedBy: "archive-curator",
      notes: "青空文庫カード: https://www.aozora.gr.jp/cards/000148/card760.html",
    },
    notes: "verified text。講演・随筆・自伝的記述として扱う。",
  },
];
