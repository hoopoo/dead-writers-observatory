import type { SourcePassage } from "@/types/source-passage";
export const ahouPassages: SourcePassage[] = [
  {
    id: "pass-akutagawa-ahou-01",
    sourceId: "src-akutagawa-ahou",
    personId: "person-akutagawa",
    text: `「人生は一行のボオドレエルにも若かない。」`,
    contextBefore: `それは或本屋の二階だつた。二十歳の彼は書棚にかけた西洋風の梯子に登り、新らしい本を探してゐた。モオパスサン、ボオドレエル、ストリントベリイ、イブセン、シヨウ、トルストイ、……`,
    locator: { section: "一 時代", anchor: "aozora-19-baudelaire" },
    voiceType: "autobiographical",
    isAuthorDirectStatement: true,
    provenanceConfidence: "high",
    verificationStatus: "verified",
    verification: {
      sourceUrl: "https://www.aozora.gr.jp/cards/000879/files/19_14618.html",
      checkedAgainst: "青空文庫 XHTML（新字旧仮名）19_14618.html",
      checkedAt: "2026-08-12",
      checkedBy: "archive-curator",
      notes: "青空文庫カード: https://www.aozora.gr.jp/cards/000879/card19.html",
    },
    notes: "verified text。講演・随筆・自伝的記述として扱う。",
  },
];
