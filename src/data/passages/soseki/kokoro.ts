import type { SourcePassage } from "@/types/source-passage";
export const kokoroPassages: SourcePassage[] = [
  {
    id: "pass-soseki-kokoro-01",
    sourceId: "src-soseki-kokoro",
    personId: "person-soseki",
    text: `私はその人を常に先生と呼んでいた。だからここでもただ先生と書くだけで本名は打ち明けない。これは世間を憚かる遠慮というよりも、その方が私にとって自然だからである。私はその人の記憶を呼び起すごとに、すぐ「先生」といいたくなる。筆を執っても心持は同じ事である。よそよそしい頭文字などはとても使う気にならない。`,
    locator: { chapter: "上 先生と私", section: "一", anchor: "aozora-773-opening" },
    voiceType: "narrator",
    speaker: "語り手（私）",
    isAuthorDirectStatement: false,
    provenanceConfidence: "high",
    verificationStatus: "verified",
    verification: {
      sourceUrl: "https://www.aozora.gr.jp/cards/000148/files/773_14560.html",
      checkedAgainst: "青空文庫 XHTML（新字新仮名）773_14560.html",
      checkedAt: "2026-08-12",
      checkedBy: "archive-curator",
      notes: "青空文庫カード: https://www.aozora.gr.jp/cards/000148/card773.html",
    },
    notes: "verified text。作者本人の直接発言としては扱わない（work voice）。",
  },
];
