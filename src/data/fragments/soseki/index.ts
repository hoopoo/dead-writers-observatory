import type { ThoughtFragment } from "@/types/thought-fragment";

export const sosekiFragments: ThoughtFragment[] = [
  {
    id: "frag-soseki-ind-01",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    passageId: "pass-soseki-ind-01",
    normalizedMeaning:
      "講演では、「自己本位」を自分の立脚地として握ったとき、進む道が見えてきたと述べられている。独立は、外部基準への従属から離れて自己の位置を定める問題として語られる。",
    themes: ["independence", "society", "self", "obligation"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    lifeStage: "late career",
    historicalContext: "大正3年・学習院での講演。",
    confidence: "high",
    interpretiveNotes:
      "verified DIRECT SOURCE。講演の修辞を現代のキャリア助言へ転用しない。",
  },
  {
    id: "frag-soseki-ind-02",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    passageId: "pass-soseki-ind-02",
    normalizedMeaning:
      "権力に次ぐものとして金力が挙げられ、個性を拡張する道具になると同時に、他人の上に押し被せる危険な利器としても眺められている。",
    themes: ["money", "work", "society", "independence", "self"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "high",
  },
  {
    id: "frag-soseki-ind-03",
    personId: "person-soseki",
    sourceId: "src-soseki-individualism",
    passageId: "pass-soseki-ind-03",
    normalizedMeaning:
      "講演では、金力には責任がついて廻らなければならないと述べられ、富の使い方が人心や徳義に影響しうると警告されている。幸福や成功の外部指標を、責任なき所有へ還元しない観点が含まれる。",
    themes: ["money", "obligation", "happiness", "society", "approval"],
    interpretationType: "direct-author-statement",
    authorialDistance: "direct",
    confidence: "high",
  },
  {
    id: "frag-soseki-gara-01",
    personId: "person-soseki",
    sourceId: "src-soseki-garasudo",
    passageId: "pass-soseki-gara-01",
    normalizedMeaning:
      "書斎から見る世界は単調で狭く、日常の観察範囲そのものが限られている、という自伝的記述がある。孤独や社会との距離を、大げさな断定ではなく生活の視野として記録している。",
    themes: ["loneliness", "self", "society", "observation", "aging"],
    interpretationType: "direct-author-statement",
    authorialDistance: "near",
    confidence: "high",
  },
  {
    id: "frag-soseki-gara-02",
    personId: "person-soseki",
    sourceId: "src-soseki-garasudo",
    passageId: "pass-soseki-gara-02",
    normalizedMeaning:
      "自伝的記述では、母の記憶がいくら辿っても老いた姿としてしか呼び起せない、と記されている。老いと記憶の非対称が、観察者自身の年齢とともに前景化する。",
    themes: ["aging", "self", "loneliness", "family", "observation"],
    interpretationType: "biographical-context",
    authorialDistance: "near",
    lifeStage: "late life",
    confidence: "medium",
    interpretiveNotes:
      "NEAR AUTHORIAL。自伝的記述を客観的事実の証明として扱わない。",
  },
  {
    id: "frag-soseki-kokoro-01",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-01",
    normalizedMeaning:
      "語り手は、ある人物を本名ではなく「先生」と呼ぶことが自然だと述べる。親密さと距離が、名前の呼び方そのものに現れる——作品内の視点。",
    themes: ["loneliness", "self", "intimacy", "society"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    historicalContext: "小説『こころ』冒頭。",
    confidence: "high",
    interpretiveNotes:
      "verified WORK VOICE。語り手 ≠ 漱石本人。",
  },
  {
    id: "frag-soseki-kokoro-02",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-02",
    normalizedMeaning:
      "『こころ』には、罪責と他者との関係をめぐる視点が現れる。登場人物「先生」は、恋を罪悪と呼ぶ。作者本人の一般思想への直結はしない。",
    themes: ["intimacy", "shame", "loneliness", "love", "fear"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "medium",
    interpretiveNotes:
      "WORK VOICE。fictional_character。漱石は〜と考えていた、と書かない。",
  },
  {
    id: "frag-soseki-kokoro-03",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-03",
    normalizedMeaning:
      "作品内では、財産の始末が人間関係の面倒を生む、という助言が登場人物の口から語られる。金銭は近代的関係の緊張を媒介する要素として描かれる。",
    themes: ["money", "modernization", "society", "intimacy", "obligation"],
    interpretationType: "narrative-perspective",
    authorialDistance: "indirect",
    confidence: "medium",
    interpretiveNotes: "WORK VOICE。作者の経済思想の要約ではない。",
  },
  {
    id: "frag-soseki-kokoro-04",
    personId: "person-soseki",
    sourceId: "src-soseki-kokoro",
    passageId: "pass-soseki-kokoro-02",
    normalizedMeaning:
      "死を思うことは、関係と責任の未解決が残っている印としても読める——作品内の構図としての仮説。",
    themes: ["death", "self", "intimacy", "obligation", "loneliness"],
    interpretationType: "work-level-theme",
    authorialDistance: "indirect",
    confidence: "low",
    interpretiveNotes: "作者の死と接続しない。WORK VOICE の延長解釈。",
  },
];
