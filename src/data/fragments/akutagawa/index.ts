import type { ThoughtFragment } from "@/types/thought-fragment";

export const akutagawaFragments: ThoughtFragment[] = [
  {
    id: "frag-akutagawa-shuju-01",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-01",
    normalizedMeaning:
      "随筆では、道徳を「便宜の異名」と呼び、恩恵（時間と労力の節約）と損害（良心の麻痺）の両面から眺めている。",
    themes: ["society", "obligation", "observation", "self", "anxiety"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "high",
  },
  {
    id: "frag-akutagawa-shuju-02",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-02",
    normalizedMeaning:
      "創作について、作品の美醜の一半（あるいは大半）は芸術家の意識を超えた領域に存する、と述べられている。自己観察と創作の緊張が主題化される。",
    themes: ["creativity", "observation", "self", "anxiety", "society"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "high",
  },
  {
    id: "frag-akutagawa-shuju-03",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-03",
    normalizedMeaning:
      "グッドセンスを欠いた幸福は、痩せ我慢の幸福に過ぎない、というアフォリズムがある。幸福を外部の誇示や我慢と取り違えない観点。",
    themes: ["happiness", "self", "observation", "anxiety", "approval"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "high",
  },
  {
    id: "frag-akutagawa-ahou-01",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    passageId: "pass-akutagawa-ahou-01",
    normalizedMeaning:
      "自伝的断章には、「人生は一行のボオドレエルにも若かない」という一文が現れる。生きることより文学的強度を優先する視線の疲労が示唆される。",
    themes: ["observation", "self", "creativity", "fatigue", "anxiety"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    lifeStage: "late career",
    confidence: "high",
    interpretiveNotes:
      "作者の死や自傷の説明として単純化しない。",
  },
  {
    id: "frag-akutagawa-ahou-02",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    passageId: "pass-akutagawa-ahou-02",
    normalizedMeaning:
      "近代的生活のテンポは、神経の疲労と不安を日常の条件として抱え込みうる（placeholder）。",
    themes: ["modernization", "anxiety", "fatigue", "society", "work"],
    interpretationType: "biographical-context",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-akutagawa-hagu-01",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-haguruma",
    passageId: "pass-akutagawa-hagu-01",
    normalizedMeaning:
      "語り手の視野に半透明の歯車が現れ、消えたあとに頭痛が残る、という知覚の変調が描かれる。作者人生への還元ではなく、作品内の不安描写として読む。",
    themes: ["anxiety", "fear", "fatigue", "observation", "death"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "high",
    interpretiveNotes:
      "verified WORK VOICE。自殺の説明や医療判断の代替に使わない。",
  },
  {
    id: "frag-akutagawa-hagu-02",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-haguruma",
    passageId: "pass-akutagawa-hagu-02",
    normalizedMeaning:
      "老いと死への恐怖が、意識の先取りとして描かれることがある（placeholder）。",
    themes: ["aging", "death", "anxiety", "fear", "observation"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "low",
  },
  {
    id: "frag-akutagawa-shuju-04",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-shuju",
    passageId: "pass-akutagawa-shuju-01",
    normalizedMeaning:
      "他者の視線への過敏は、羞恥より先に自己意識の過剰作動として経験されることがある、という解釈上の接続。",
    themes: ["approval", "shame", "anxiety", "observation", "self"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
  {
    id: "frag-akutagawa-ahou-03",
    personId: "person-akutagawa",
    sourceId: "src-akutagawa-ahou",
    passageId: "pass-akutagawa-ahou-01",
    normalizedMeaning:
      "孤独は人数の不足だけでなく、意味の共有ができない状態としても現れる、という読み（部分的支持）。",
    themes: ["loneliness", "society", "self", "anxiety", "happiness"],
    interpretationType: "critical-inference",
    authorialDistance: "near",
    confidence: "low",
  },
];
