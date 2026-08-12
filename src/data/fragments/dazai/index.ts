import type { ThoughtFragment } from "@/types/thought-fragment";

export const dazaiFragments: ThoughtFragment[] = [
  {
    id: "frag-dazai-ningen-01",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    passageId: "pass-dazai-ningen-01",
    normalizedMeaning:
      "人との接触は、親密さの欲求と同時に、見られることへの羞恥と失格感を強めることがある——という構図が作品に現れる。",
    themes: ["shame", "intimacy", "loneliness", "approval", "self"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "medium",
    interpretiveNotes:
      "語り手の視点。太宰本人の思想や体験として表示しない。自傷の美化を禁止。",
  },
  {
    id: "frag-dazai-ningen-02",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    passageId: "pass-dazai-ningen-02",
    normalizedMeaning:
      "他者への恐れと依存は、自己演出を通じて親密さを得ようとする緊張として描かれる。",
    themes: ["fear", "intimacy", "performance", "shame", "approval"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "medium",
    interpretiveNotes: "登場人物の視点。作者との同一化を禁止。",
  },
  {
    id: "frag-dazai-tsugaru-01",
    personId: "person-dazai",
    sourceId: "src-dazai-tsugaru",
    passageId: "pass-dazai-tsugaru-01",
    normalizedMeaning:
      "故郷や家族への回帰は、帰属の回復であると同時に、受け入れられたい欲求の再燃でもある。",
    themes: ["family", "loneliness", "intimacy", "self", "shame"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "medium",
  },
  {
    id: "frag-dazai-tsugaru-02",
    personId: "person-dazai",
    sourceId: "src-dazai-tsugaru",
    passageId: "pass-dazai-tsugaru-02",
    normalizedMeaning:
      "孤独は友人がいないことだけでなく、本当の自分を見せたときに拒まれる予感としても現れる。",
    themes: ["loneliness", "intimacy", "shame", "approval", "self"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "medium",
  },
  {
    id: "frag-dazai-fugaku-01",
    personId: "person-dazai",
    sourceId: "src-dazai-fugaku",
    passageId: "pass-dazai-fugaku-01",
    normalizedMeaning:
      "創作や名声への欲望は、達成しても満たされず、周囲との比較と自己演出を刺激し続ける。",
    themes: ["creativity", "approval", "happiness", "shame", "self"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "medium",
  },
  {
    id: "frag-dazai-fugaku-02",
    personId: "person-dazai",
    sourceId: "src-dazai-fugaku",
    passageId: "pass-dazai-fugaku-02",
    normalizedMeaning:
      "日常の観察の中に、他者評価への敏感さと、自分を演じる疲労が混在することがある。",
    themes: ["observation", "approval", "performance", "self", "anxiety"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "medium",
  },
  {
    id: "frag-dazai-tsugaru-03",
    personId: "person-dazai",
    sourceId: "src-dazai-tsugaru",
    passageId: "pass-dazai-tsugaru-01",
    normalizedMeaning:
      "金銭的不安や生活の失敗は、単なる経済問題ではなく、愛される資格への疑いに接続しやすい。",
    themes: ["money", "work", "shame", "love", "fear"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-dazai-fugaku-03",
    personId: "person-dazai",
    sourceId: "src-dazai-fugaku",
    passageId: "pass-dazai-fugaku-02",
    normalizedMeaning:
      "結婚や将来の制度選択への動揺は、幸福の計算より先に、誰かに正しいと認めてもらいたい欲求を含みうる。",
    themes: ["love", "family", "approval", "happiness", "aging"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-dazai-ningen-03",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    passageId: "pass-dazai-ningen-02",
    normalizedMeaning:
      "死を思うことは、生き方の美学ではなく、生き続ける資格への羞恥と疲労が極まった地点として作品内に扱われうる。",
    themes: ["death", "shame", "fatigue", "loneliness", "self"],
    interpretationType: "work-level-theme",
    authorialDistance: "indirect",
    confidence: "low",
    interpretiveNotes:
      "安全配慮: 文学的美化・推奨を禁止。作者の死と相談者を同一化しない。",
  },
];
