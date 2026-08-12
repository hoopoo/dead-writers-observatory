import type { SourcePassage } from "@/types/source-passage";
export const fugakuPassages: SourcePassage[] = [
  {
    id: "pass-dazai-fugaku-01",
    sourceId: "src-dazai-fugaku",
    personId: "person-dazai",
    text: `井伏氏は、仕事をして居られた。私は、井伏氏のゆるしを得て、当分その茶屋に落ちつくことになつて、それから、毎日、いやでも富士と真正面から、向き合つてゐなければならなくなつた。この峠は、甲府から東海道に出る鎌倉往還の衝に当つてゐて、北面富士の代表観望台であると言はれ、ここから見た富士は、むかしから富士三景の一つにかぞへられてゐるのださうであるが、私は、あまり好かなかつた。好かないばかりか、軽蔑さへした。あまりに、おあつらひむきの富士である。`,
    locator: { section: "御坂峠", anchor: "aozora-270-haji" },
    voiceType: "autobiographical",
    isAuthorDirectStatement: true,
    provenanceConfidence: "high",
    verificationStatus: "verified",
    verification: {
      sourceUrl: "https://www.aozora.gr.jp/cards/000035/files/270_14914.html",
      checkedAgainst: "青空文庫 XHTML（新字旧仮名）270_14914.html",
      checkedAt: "2026-08-12",
      checkedBy: "archive-curator",
      notes: "青空文庫カード: https://www.aozora.gr.jp/cards/000035/card270.html",
    },
    notes: "verified text。講演・随筆・自伝的記述として扱う。",
  },
];
