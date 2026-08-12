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
  {
    id: "pass-soseki-kokoro-02",
    sourceId: "src-soseki-kokoro",
    personId: "person-soseki",
    text: `「聞こえました。恋の満足を味わっている人はもっと暖かい声を出すものです。しかし……しかし君、恋は罪悪ですよ。解っていますか」`,
    locator: {
      chapter: "上 先生と私",
      section: "恋は罪悪",
      anchor: "aozora-773-tsumi",
    },
    voiceType: "fictional_character",
    speaker: "先生",
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
    notes:
      "verified WORK VOICE。登場人物「先生」の台詞。漱石本人の直接発言ではない。",
  },
  {
    id: "pass-soseki-kokoro-03",
    sourceId: "src-soseki-kokoro",
    personId: "person-soseki",
    text: `「君のうちに財産があるなら、今のうちによく始末をつけてもらっておかないといけないと思うがね、余計なお世話だけれども。君のお父さんが達者なうちに、貰うものはちゃんと貰っておくようにしたらどうですか。万一の事があったあとで、一番面倒の起るのは財産の問題だから」`,
    locator: {
      chapter: "上 先生と私",
      section: "財産の問題",
      anchor: "aozora-773-zaisan",
    },
    voiceType: "fictional_character",
    speaker: "先生",
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
    notes:
      "verified WORK VOICE。金銭・近代的関係をめぐる登場人物の助言。作者思想への直結を禁止。",
  },
];
