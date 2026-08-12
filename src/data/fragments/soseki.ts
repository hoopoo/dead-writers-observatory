import type { ThoughtFragment } from "@/types/thought-fragment";

export const sosekiFragments: ThoughtFragment[] = [
  {
    id: "frag-soseki-01",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    normalizedMeaning:
      "個人の自立は、他人の内面を侵さない自制とセットで成立する。独立は単なる自己主張ではない。",
    themes: ["independence", "society", "self", "obligation"],
    lifeStage: "late career",
    historicalContext: "大正期の講演。近代的個人主義の意味を聴衆に説明。",
    confidence: 0.82,
    interpretiveNotes:
      "職業選択や独立の不安は、社会的役割からの離脱と自己定義の衝突として読める。",
  },
  {
    id: "frag-soseki-02",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    normalizedMeaning:
      "近代的自我は他者への罪悪感や距離感と結びつき、親密さそのものが重荷になりうる。",
    themes: ["loneliness", "self", "intimacy", "shame", "society"],
    historicalContext: "明治末〜大正の知識人的孤独と倫理。",
    confidence: 0.8,
  },
  {
    id: "frag-soseki-03",
    personId: "person-soseki",
    sourceId: "src-soseki-sorekara",
    normalizedMeaning:
      "働くこと・働かないことは、単なる生計問題ではなく、社会的役割と自己像の問題として現れる。",
    themes: ["work", "money", "society", "self", "independence"],
    historicalContext: "高等教育を受けた無職知識人の停滞。",
    confidence: 0.78,
  },
  {
    id: "frag-soseki-04",
    personId: "person-soseki",
    sourceId: "src-soseki-mon",
    normalizedMeaning:
      "社会的規範から外れた親密関係は、外的制裁だけでなく内的閉塞を生む。",
    themes: ["love", "family", "society", "shame", "intimacy"],
    confidence: 0.76,
  },
  {
    id: "frag-soseki-05",
    personId: "person-soseki",
    sourceId: "src-soseki-garasudo",
    normalizedMeaning:
      "老いと病は、社会的役割の縮退と自己観察の深化を同時に連れてくる。",
    themes: ["aging", "self", "loneliness", "fatigue", "death"],
    lifeStage: "late life",
    confidence: 0.77,
  },
  {
    id: "frag-soseki-06",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    normalizedMeaning:
      "金銭や地位は独立の条件になりうる一方で、それ自体が自我を縛る社会的圧力にもなる。",
    themes: ["money", "work", "society", "independence", "self"],
    confidence: 0.75,
  },
  {
    id: "frag-soseki-07",
    personId: "person-soseki",
    sourceId: "src-soseki-diary",
    normalizedMeaning:
      "日常の疲労や対人関係の摩擦は、私的感情であると同時に近代社会のテンポの問題でもある。",
    themes: ["fatigue", "society", "modernization", "anxiety", "work"],
    confidence: 0.7,
  },
  {
    id: "frag-soseki-08",
    personId: "person-soseki",
    sourceId: "src-soseki-letters",
    normalizedMeaning:
      "幸福は外部評価の延長ではなく、自己の位置取りと義務の整理の問題として問われる。",
    themes: ["happiness", "self", "obligation", "approval", "society"],
    confidence: 0.72,
  },
  {
    id: "frag-soseki-09",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    normalizedMeaning:
      "死を思うことは、生き方の失敗の総括ではなく、関係と責任の未解決が残っている印でもある。",
    themes: ["death", "self", "intimacy", "obligation", "loneliness"],
    confidence: 0.74,
    interpretiveNotes:
      "死の主題は文学的美化ではなく、関係責任の残滓として扱う。",
  },
];
