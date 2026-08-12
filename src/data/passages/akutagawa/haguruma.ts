import type { SourcePassage } from "@/types/source-passage";
export const hagurumaPassages: SourcePassage[] = [
  {
    id: "pass-akutagawa-hagu-01",
    sourceId: "src-akutagawa-haguruma",
    personId: "person-akutagawa",
    text: `レエン・コオトを着た男は僕のＴ君と別れる時にはいつかそこにいなくなっていた。僕は省線電車の或停車場からやはり鞄をぶら下げたまま、或ホテルへ歩いて行った。往来の両側に立っているのは大抵大きいビルディングだった。僕はそこを歩いているうちにふと松林を思い出した。のみならず僕の視野のうちに妙なものを見つけ出した。妙なものを？――と云うのは絶えずまわっている半透明の歯車だった。僕はこう云う経験を前にも何度か持ち合せていた。歯車は次第に数を殖やし、半ば僕の視野を塞いでしまう、が、それも長いことではない、暫らくの後には消え失せる代りに今度は頭痛を感じはじめる、――それはいつも同じことだった。眼科の医者はこの錯覚（？）の為に度々僕に節煙を命じた。`,
    locator: { section: "一 レエン・コート", anchor: "aozora-42377-haguruma" },
    voiceType: "narrator",
    speaker: "語り手（僕）",
    isAuthorDirectStatement: false,
    provenanceConfidence: "high",
    verificationStatus: "verified",
    verification: {
      sourceUrl: "https://www.aozora.gr.jp/cards/000879/files/42377_34745.html",
      checkedAgainst: "青空文庫 XHTML（新字新仮名）42377_34745.html",
      checkedAt: "2026-08-12",
      checkedBy: "archive-curator",
      notes: "青空文庫カード: https://www.aozora.gr.jp/cards/000879/card42377.html",
    },
    notes: "verified text。作者本人の直接発言としては扱わない（work voice）。",
  },
];
