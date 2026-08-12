import type { ThoughtFragment } from "@/types/thought-fragment";

export const akutagawaFragments: ThoughtFragment[] = [
  {
    id: "frag-akutagawa-01",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    normalizedMeaning:
      "思考は世界を照らす一方で、同じ思考が不安を増幅し、現実以上の苦痛を作ることがある。",
    themes: ["anxiety", "observation", "self", "fear"],
    confidence: 0.84,
  },
  {
    id: "frag-akutagawa-02",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    normalizedMeaning:
      "自己観察が過度になると、人生そのものが材料化され、生きることより眺め続けることが優勢になる。",
    themes: ["observation", "self", "creativity", "fatigue", "anxiety"],
    lifeStage: "late career",
    confidence: 0.83,
  },
  {
    id: "frag-akutagawa-03",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-haguruma",
    normalizedMeaning:
      "神経の過敏と幻覚的不安は、外界の脅威と内界の連想が区別しにくくなる状態を示す。",
    themes: ["anxiety", "fear", "fatigue", "death", "observation"],
    confidence: 0.8,
    interpretiveNotes:
      "医療判断の代替には使わない。思考の増幅構造の史料として扱う。",
  },
  {
    id: "frag-akutagawa-04",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-kappa",
    normalizedMeaning:
      "社会制度や労働の合理性を外部から見ると、幸福や効率の定義自体が奇異に見える。",
    themes: ["society", "work", "happiness", "modernization", "money"],
    confidence: 0.78,
  },
  {
    id: "frag-akutagawa-05",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-bungei",
    normalizedMeaning:
      "創作は意味の探求であると同時に、意味を求め続けること自体が神経をすり減らす行為でもある。",
    themes: ["creativity", "anxiety", "self", "fatigue", "observation"],
    confidence: 0.81,
  },
  {
    id: "frag-akutagawa-06",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-letters",
    normalizedMeaning:
      "他者の視線への過敏は、羞恥というより先に、自己意識の過剰作動として経験されることがある。",
    themes: ["approval", "shame", "anxiety", "observation", "self"],
    confidence: 0.76,
  },
  {
    id: "frag-akutagawa-07",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    normalizedMeaning:
      "恋愛や親密さへの疑念は、感情そのものより、感情を分析しすぎる知性の副作用として現れうる。",
    themes: ["love", "intimacy", "anxiety", "observation", "self"],
    confidence: 0.74,
  },
  {
    id: "frag-akutagawa-08",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    normalizedMeaning:
      "老いと死への恐怖は、未来の出来事というより、いまの意識が未来を先取りして苦しむ形をとる。",
    themes: ["aging", "death", "anxiety", "fear", "observation"],
    confidence: 0.77,
  },
  {
    id: "frag-akutagawa-09",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-kappa",
    normalizedMeaning:
      "孤独は人数の不足だけでなく、意味の共有ができない状態としても現れる。",
    themes: ["loneliness", "society", "self", "anxiety", "happiness"],
    confidence: 0.75,
  },
];
