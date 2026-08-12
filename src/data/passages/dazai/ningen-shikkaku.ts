import type { SourcePassage } from "@/types/source-passage";
export const ningenPassages: SourcePassage[] = [
  {
    id: "pass-dazai-ningen-01",
    sourceId: "src-dazai-ningen",
    personId: "person-dazai",
    text: `恥の多い生涯を送って来ました。
自分には、人間の生活というものが、見当つかないのです。自分は東北の田舎に生れましたので、汽車をはじめて見たのは、よほど大きくなってからでした。自分は停車場のブリッジを、上って、降りて、そうしてそれが線路をまたぎ越えるために造られたものだという事には全然気づかず、ただそれは停車場の構内を外国の遊戯場みたいに、複雑に楽しく、ハイカラにするためにのみ、設備せられてあるものだとばかり思っていました。しかも、かなり永い間そう思っていたのです。`,
    locator: { chapter: "第一の手記", anchor: "aozora-301-haji" },
    voiceType: "narrator",
    speaker: "大庭葉蔵（語り手）",
    isAuthorDirectStatement: false,
    provenanceConfidence: "high",
    verificationStatus: "verified",
    verification: {
      sourceUrl: "https://www.aozora.gr.jp/cards/000035/files/301_14912.html",
      checkedAgainst: "青空文庫 XHTML（新字新仮名）301_14912.html",
      checkedAt: "2026-08-12",
      checkedBy: "archive-curator",
      notes: "青空文庫カード: https://www.aozora.gr.jp/cards/000035/card301.html",
    },
    notes: "verified text。作者本人の直接発言としては扱わない（work voice）。",
  },
  {
    id: "pass-dazai-ningen-02",
    sourceId: "src-dazai-ningen",
    personId: "person-dazai",
    text: `そこで考え出したのは、道化でした。
それは、自分の、人間に対する最後の求愛でした。自分は、人間を極度に恐れていながら、それでいて、人間を、どうしても思い切れなかったらしいのです。そうして自分は、この道化の一線でわずかに人間につながる事が出来たのでした。おもてでは、絶えず笑顔をつくりながらも、内心は必死の、それこそ千番に一番の兼ね合いとでもいうべき危機一髪の、油汗流してのサーヴィスでした。`,
    locator: { chapter: "第一の手記", anchor: "aozora-301-douke" },
    voiceType: "narrator",
    speaker: "大庭葉蔵（語り手）",
    isAuthorDirectStatement: false,
    provenanceConfidence: "high",
    verificationStatus: "verified",
    verification: {
      sourceUrl: "https://www.aozora.gr.jp/cards/000035/files/301_14912.html",
      checkedAgainst: "青空文庫 XHTML（新字新仮名）301_14912.html",
      checkedAt: "2026-08-12",
      checkedBy: "archive-curator",
      notes: "青空文庫カード: https://www.aozora.gr.jp/cards/000035/card301.html",
    },
    notes: "verified text。作者本人の直接発言としては扱わない（work voice）。",
  },
];
