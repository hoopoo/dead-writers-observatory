import type { ThoughtFragment } from "@/types/thought-fragment";

export const dazaiFragments: ThoughtFragment[] = [
  {
    id: "frag-dazai-01",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    normalizedMeaning:
      "人との接触は、親密さの欲求と同時に、見られることへの羞恥と失格感を強めることがある。",
    themes: ["shame", "intimacy", "loneliness", "approval", "self"],
    confidence: 0.84,
    interpretiveNotes:
      "自傷や自己破壊の肯定には使わない。羞恥と演技の構造を読む。",
  },
  {
    id: "frag-dazai-02",
    personId: "person-dazai",
    sourceId: "src-dazai-shayo",
    normalizedMeaning:
      "家系・階級・家族の物語が崩れるとき、個人は新しい自己像を許されるかどうかを問われる。",
    themes: ["family", "society", "self", "love", "independence"],
    historicalContext: "戦後の没落貴族の生活と倫理の転換。",
    confidence: 0.8,
  },
  {
    id: "frag-dazai-03",
    personId: "person-dazai",
    sourceId: "src-dazai-jogakusei",
    normalizedMeaning:
      "日常の些細な観察の中に、他者評価への敏感さと、自分を演じる疲労が混在する。",
    themes: ["observation", "approval", "performance", "self", "anxiety"],
    confidence: 0.77,
  },
  {
    id: "frag-dazai-04",
    personId: "person-dazai",
    sourceId: "src-dazai-fugaku",
    normalizedMeaning:
      "創作や名声への欲望は、達成しても満たされず、周囲との比較と自己演出を刺激し続ける。",
    themes: ["creativity", "approval", "happiness", "shame", "self"],
    confidence: 0.79,
  },
  {
    id: "frag-dazai-05",
    personId: "person-dazai",
    sourceId: "src-dazai-melos",
    normalizedMeaning:
      "信頼と裏切りの緊張は、友情や約束が自己価値の証明になる構造を照らし出す。",
    themes: ["intimacy", "approval", "love", "fear", "obligation"],
    confidence: 0.73,
  },
  {
    id: "frag-dazai-06",
    personId: "person-dazai",
    sourceId: "src-dazai-tsugaru",
    normalizedMeaning:
      "故郷や家族への回帰は、帰属の回復であると同時に、受け入れられたい欲求の再燃でもある。",
    themes: ["family", "loneliness", "intimacy", "self", "shame"],
    confidence: 0.78,
  },
  {
    id: "frag-dazai-07",
    personId: "person-dazai",
    sourceId: "src-dazai-essays",
    normalizedMeaning:
      "金銭的不安や生活の失敗は、単なる経済問題ではなく、愛される資格への疑いに接続しやすい。",
    themes: ["money", "work", "shame", "love", "fear"],
    confidence: 0.74,
  },
  {
    id: "frag-dazai-08",
    personId: "person-dazai",
    sourceId: "src-dazai-letters",
    normalizedMeaning:
      "孤独は友人がいないことだけでなく、本当の自分を見せたときに拒まれる予感としても現れる。",
    themes: ["loneliness", "intimacy", "shame", "approval", "self"],
    confidence: 0.81,
  },
  {
    id: "frag-dazai-09",
    personId: "person-dazai",
    sourceId: "src-dazai-ningen",
    normalizedMeaning:
      "死を思うことは、生き方の美学ではなく、生き続ける資格への羞恥と疲労が極まった地点として扱われるべきである。",
    themes: ["death", "shame", "fatigue", "loneliness", "self"],
    confidence: 0.76,
    interpretiveNotes:
      "安全配慮: 文学的美化・推奨を禁止。苦痛の構造理解に限定。",
  },
  {
    id: "frag-dazai-10",
    personId: "person-dazai",
    sourceId: "src-dazai-shayo",
    normalizedMeaning:
      "結婚や将来の制度選択への動揺は、幸福の計算より先に、誰かに正しいと認めてもらいたい欲求を含みうる。",
    themes: ["love", "family", "approval", "happiness", "aging"],
    confidence: 0.75,
  },
];
