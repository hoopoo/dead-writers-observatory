import type { ThoughtFragment } from "@/types/thought-fragment";

export const akutagawaFragments: ThoughtFragment[] = [
  {
    id: "frag-akutagawa-shuju-01",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-01",
    normalizedMeaning:
      "思考は世界を照らす一方で、同じ思考が不安を増幅し、現実以上の苦痛を作ることがある。",
    themes: ["anxiety", "observation", "self", "fear"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "medium",
  },
  {
    id: "frag-akutagawa-shuju-02",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-02",
    normalizedMeaning:
      "創作や芸術への関心は、意味の探求であると同時に、自己観察を過剰にする契機にもなる。",
    themes: ["creativity", "observation", "self", "anxiety", "society"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "medium",
  },
  {
    id: "frag-akutagawa-ahou-01",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    passageId: "pass-akutagawa-ahou-01",
    normalizedMeaning:
      "自己観察が過度になると、人生そのものが材料化され、生きることより眺め続けることが優勢になる。",
    themes: ["observation", "self", "creativity", "fatigue", "anxiety"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    lifeStage: "late career",
    confidence: "medium",
    interpretiveNotes:
      "自伝的断章。作者の死や自傷の説明として単純化しない。",
  },
  {
    id: "frag-akutagawa-ahou-02",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    passageId: "pass-akutagawa-ahou-02",
    normalizedMeaning:
      "近代的生活のテンポは、神経の疲労と不安を日常の条件として抱え込みうる。",
    themes: ["modernization", "anxiety", "fatigue", "society", "work"],
    interpretationType: "biographical-context",
    authorialDistance: "near",
    confidence: "medium",
  },
  {
    id: "frag-akutagawa-hagu-01",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-haguruma",
    passageId: "pass-akutagawa-hagu-01",
    normalizedMeaning:
      "神経の過敏と知覚の変調は、外界の脅威と内界の連想が区別しにくくなる状態として作品に現れる。",
    themes: ["anxiety", "fear", "fatigue", "observation", "death"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "medium",
    interpretiveNotes:
      "小説の語り。作者の自殺の説明や医療判断の代替には使わない。",
  },
  {
    id: "frag-akutagawa-hagu-02",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-haguruma",
    passageId: "pass-akutagawa-hagu-02",
    normalizedMeaning:
      "老いと死への恐怖は、未来の出来事というより、いまの意識が未来を先取りして苦しむ形として描かれる。",
    themes: ["aging", "death", "anxiety", "fear", "observation"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "low",
    interpretiveNotes:
      "作品内の視点。作者人生への還元や相談者との安易な同一化を禁止。",
  },
  {
    id: "frag-akutagawa-shuju-03",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-01",
    normalizedMeaning:
      "他者の視線への過敏は、羞恥というより先に、自己意識の過剰作動として経験されることがある。",
    themes: ["approval", "shame", "anxiety", "observation", "self"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "low",
  },
  {
    id: "frag-akutagawa-ahou-03",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    passageId: "pass-akutagawa-ahou-01",
    normalizedMeaning:
      "孤独は人数の不足だけでなく、意味の共有ができない状態としても現れる。",
    themes: ["loneliness", "society", "self", "anxiety", "happiness"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-akutagawa-shuju-04",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-02",
    normalizedMeaning:
      "社会制度や労働の合理性を外部から見ると、幸福や効率の定義自体が奇異に見えることがある。",
    themes: ["society", "work", "happiness", "modernization", "money"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "low",
  },
];
