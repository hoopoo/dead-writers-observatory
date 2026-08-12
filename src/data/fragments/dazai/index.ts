import type { ThoughtFragment } from "@/types/thought-fragment";

export const dazaiFragments: ThoughtFragment[] = [
  {
    id: "frag-dazai-ningen-01",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    passageId: "pass-dazai-ningen-01",
    normalizedMeaning:
      "『人間失格』の語り手は「恥の多い生涯を送って来ました」と書き出し、人間の生活が見当つかないと述べる。羞恥と生活理解の不全が作品冒頭に置かれる——作品内の声。",
    themes: ["shame", "intimacy", "loneliness", "approval", "self"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "high",
    interpretiveNotes:
      "verified WORK VOICE。太宰本人の思想や体験として表示しない。",
  },
  {
    id: "frag-dazai-ningen-02",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    passageId: "pass-dazai-ningen-02",
    normalizedMeaning:
      "語り手は、人間を極度に恐れながらも思い切れず、「道化」によって他者とつながろうとする。他者の前で自己を演じる感覚が強く描かれている。",
    themes: ["fear", "intimacy", "performance", "shame", "approval"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "high",
    interpretiveNotes:
      "「太宰は人間は演技して生きると考えた」への変換を禁止。",
  },
  {
    id: "frag-dazai-tsugaru-01",
    personId: "person-dazai",
    sourceId: "src-dazai-tsugaru",
    passageId: "pass-dazai-tsugaru-01",
    normalizedMeaning:
      "津軽半島を一周した旅が、三十幾年の生涯でかなり重要な事件だった、と自伝的に記されている。故郷・帰属の再確認が主題化される。",
    themes: ["family", "loneliness", "intimacy", "self", "society"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "high",
  },
  {
    id: "frag-dazai-tsugaru-02",
    personId: "person-dazai",
    sourceId: "src-dazai-tsugaru",
    passageId: "pass-dazai-tsugaru-02",
    normalizedMeaning:
      "幼少期に生みの母よりも叔母を慕い、五所川原の家へ通った、という記述がある。親密さと帰属は、血縁の形式だけでは測れない。",
    themes: ["family", "intimacy", "loneliness", "self", "shame"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "high",
  },
  {
    id: "frag-dazai-fugaku-01",
    personId: "person-dazai",
    sourceId: "src-dazai-fugaku",
    passageId: "pass-dazai-fugaku-01",
    normalizedMeaning:
      "御坂峠の富士を「註文どおり」すぎると感じ、恥づかしくてならなかった、と記す。自己像や美意識が、社会的に期待される景色への違和として現れる。",
    themes: ["creativity", "approval", "shame", "self", "observation"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "high",
  },
  {
    id: "frag-dazai-fugaku-02",
    personId: "person-dazai",
    sourceId: "src-dazai-fugaku",
    passageId: "pass-dazai-fugaku-01",
    normalizedMeaning:
      "日常の観察の中に、他者評価への敏感さと自己演出の疲労が混在しうる、という読み（部分的支持）。",
    themes: ["observation", "approval", "performance", "self", "anxiety"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-dazai-tsugaru-03",
    personId: "person-dazai",
    sourceId: "src-dazai-tsugaru",
    passageId: "pass-dazai-tsugaru-02",
    normalizedMeaning:
      "金銭的不安や生活の失敗は、愛される資格への疑いに接続しやすい、という解釈上の仮説。",
    themes: ["money", "work", "shame", "love", "fear"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-dazai-fugaku-03",
    personId: "person-dazai",
    sourceId: "src-dazai-fugaku",
    passageId: "pass-dazai-fugaku-01",
    normalizedMeaning:
      "将来の制度選択への動揺は、誰かに正しいと認めてもらいたい欲求を含みうる、という仮説。",
    themes: ["love", "family", "approval", "happiness", "aging"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-dazai-ningen-03",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    passageId: "pass-dazai-ningen-01",
    normalizedMeaning:
      "死を思うことは、作品内では羞恥と疲労の地点としても読まれうる。作者の死と相談者を同一化しない。",
    themes: ["death", "shame", "fatigue", "loneliness", "self"],
    interpretationType: "work-level-theme",
    authorialDistance: "indirect",
    confidence: "low",
    interpretiveNotes: "安全配慮: 文学的美化・推奨を禁止。",
  },
];
