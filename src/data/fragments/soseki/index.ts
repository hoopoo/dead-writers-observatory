import type { ThoughtFragment } from "@/types/thought-fragment";

export const sosekiFragments: ThoughtFragment[] = [
  {
    id: "frag-soseki-ind-01",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    passageId: "pass-soseki-ind-01",
    normalizedMeaning:
      "個人の自立は、他人の内面を侵さない自制とセットで成立する。独立は単なる自己主張ではない。",
    themes: ["independence", "society", "self", "obligation"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    lifeStage: "late career",
    historicalContext: "大正期の講演。近代的個人主義の意味を聴衆に説明。",
    confidence: "medium",
    interpretiveNotes:
      "講演における作者本人の直接発言として扱う。ただし講演の修辞がそのまま「真実」とは限らない。",
  },
  {
    id: "frag-soseki-ind-02",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    passageId: "pass-soseki-ind-02",
    normalizedMeaning:
      "金銭や地位は独立の条件になりうる一方で、それ自体が自我を縛る社会的圧力にもなる。",
    themes: ["money", "work", "society", "independence", "self"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "medium",
  },
  {
    id: "frag-soseki-gara-01",
    personId: "person-soseki",
    sourceId: "src-soseki-garasudo",
    passageId: "pass-soseki-gara-01",
    normalizedMeaning:
      "日常の疲労や対人関係の摩擦は、私的感情であると同時に近代社会のテンポの問題でもある。",
    themes: ["fatigue", "society", "modernization", "anxiety", "work"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "medium",
  },
  {
    id: "frag-soseki-gara-02",
    personId: "person-soseki",
    sourceId: "src-soseki-garasudo",
    passageId: "pass-soseki-gara-02",
    normalizedMeaning:
      "老いと病は、社会的役割の縮退と自己観察の深化を同時に連れてくる。",
    themes: ["aging", "self", "loneliness", "fatigue", "death"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    lifeStage: "late life",
    confidence: "medium",
  },
  {
    id: "frag-soseki-kokoro-01",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-01",
    normalizedMeaning:
      "近代的自我は他者への距離感と結びつき、親密さそのものが重荷になりうる——という視点が作品に現れる。",
    themes: ["loneliness", "self", "intimacy", "society"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    historicalContext: "明治末〜大正の知識人的孤独を題材化した小説。",
    confidence: "medium",
    interpretiveNotes:
      "語り手の視点。漱石本人の体験や思想として表示してはならない。",
  },
  {
    id: "frag-soseki-kokoro-02",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-02",
    normalizedMeaning:
      "信頼と罪責は親密関係の内部で増幅し、他者との距離を修復不能にする——という構図が作品に現れる。",
    themes: ["intimacy", "shame", "loneliness", "love", "fear"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "medium",
    interpretiveNotes:
      "登場人物「先生」の視点。作者本人の断定ではない。",
  },
  {
    id: "frag-soseki-kokoro-03",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-03",
    normalizedMeaning:
      "金銭や社会的地位は、近代的関係の中で信頼と罪悪感を媒介する要素として描かれる。",
    themes: ["money", "modernization", "society", "intimacy", "happiness"],
    interpretationType: "work-level-theme",
    authorialDistance: "indirect",
    confidence: "low",
  },
  {
    id: "frag-soseki-ind-03",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    passageId: "pass-soseki-ind-01",
    normalizedMeaning:
      "幸福は外部評価の延長ではなく、自己の位置取りと義務の整理の問題として問われる。",
    themes: ["happiness", "self", "obligation", "approval", "society"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "low",
    interpretiveNotes: "講演の論点からの正規化。原文未検証のため confidence low。",
  },
  {
    id: "frag-soseki-kokoro-04",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-02",
    normalizedMeaning:
      "死を思うことは、生き方の失敗の総括ではなく、関係と責任の未解決が残っている印としても読める——作品内の構図として。",
    themes: ["death", "self", "intimacy", "obligation", "loneliness"],
    interpretationType: "work-level-theme",
    authorialDistance: "indirect",
    confidence: "low",
    interpretiveNotes:
      "死の主題は文学的美化ではなく、関係責任の残滓として扱う。作者の死と接続しない。",
  },
];
