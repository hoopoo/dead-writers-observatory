import type {
  QuestionAnalysis,
  SafetyFlag,
} from "@/types/question-analysis";
import type { ThemeTag } from "@/types/thought-fragment";

interface ThemeRule {
  theme: ThemeTag;
  patterns: RegExp[];
  weight: number;
}

const THEME_RULES: ThemeRule[] = [
  {
    theme: "work",
    patterns: [/会社/, /仕事/, /職/, /独立/, /退職/, /辞/, /労働/, /キャリア/],
    weight: 3,
  },
  {
    theme: "independence",
    patterns: [/独立/, /自分で/, /自由/, /辞めて/],
    weight: 2,
  },
  {
    theme: "money",
    patterns: [/収入/, /お金/, /金/, /給料/, /経済/, /貧乏/, /生活費/],
    weight: 3,
  },
  {
    theme: "loneliness",
    patterns: [/孤独/, /ひとり/, /一人/, /寂しい/, /居場所/],
    weight: 3,
  },
  {
    theme: "love",
    patterns: [/恋愛/, /結婚/, /愛/, /恋人/, /好き/],
    weight: 2,
  },
  {
    theme: "family",
    patterns: [/家族/, /親/, /結婚/, /家庭/],
    weight: 2,
  },
  {
    theme: "aging",
    patterns: [/歳/, /老/, /年を取/, /将来/, /老い/],
    weight: 3,
  },
  {
    theme: "anxiety",
    patterns: [/不安/, /怖い/, /恐/, /心配/, /気にな/, /わからなく/],
    weight: 2,
  },
  {
    theme: "fear",
    patterns: [/怖い/, /恐/, /奪わ/, /失/],
    weight: 2,
  },
  {
    theme: "shame",
    patterns: [/羞恥/, /恥/, /失格/, /見られ/, /どう見/],
    weight: 2,
  },
  {
    theme: "approval",
    patterns: [/見られ/, /評価/, /成功/, /SNS/, /認め/, /どう見/],
    weight: 3,
  },
  {
    theme: "creativity",
    patterns: [/作りたい/, /創作/, /意味/, /表現/, /作品/, /何かを作/],
    weight: 3,
  },
  {
    theme: "death",
    patterns: [/死/, /生きれ/, /生き方/, /自死/, /消え/],
    weight: 3,
  },
  {
    theme: "happiness",
    patterns: [/幸福/, /幸せ/, /満た/, /成功しているはず/, /成功/],
    weight: 3,
  },
  {
    theme: "society",
    patterns: [/社会/, /AI/, /制度/, /世間/, /会社/],
    weight: 2,
  },
  {
    theme: "modernization",
    patterns: [/AI/, /SNS/, /現代/, /テクノロジー/],
    weight: 2,
  },
  {
    theme: "performance",
    patterns: [/SNS/, /演じ/, /見せ/, /やめたいのに/],
    weight: 2,
  },
  {
    theme: "intimacy",
    patterns: [/友達/, /親密/, /孤独/, /結婚/, /愛され/],
    weight: 2,
  },
  {
    theme: "self",
    patterns: [/自分/, /自己/, /私/, /どう生き/, /成功しているはず/, /意味があるのか/],
    weight: 2,
  },
  {
    theme: "observation",
    patterns: [/考え/, /わから/, /気にな/, /意味があるのか/],
    weight: 1,
  },
];

function detectThemes(text: string): ThemeTag[] {
  const scores = new Map<ThemeTag, number>();

  for (const rule of THEME_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        scores.set(rule.theme, (scores.get(rule.theme) ?? 0) + rule.weight);
      }
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const themes = ranked.map(([theme]) => theme);

  if (themes.length === 0) {
    return ["self", "anxiety", "society"];
  }

  return themes.slice(0, 6);
}

function detectSafetyFlags(text: string): SafetyFlag[] {
  const flags: SafetyFlag[] = [];

  if (/死|消えたい|自死|自殺|生きていけない/.test(text)) {
    flags.push("death_theme");
  }
  if (/自殺|消えたい|死にたい|傷つ/.test(text)) {
    flags.push("self_harm_adjacent");
  }
  if (/投資|法律|診断|病|薬|弁護士|医療/.test(text)) {
    flags.push("medical_legal_financial");
  }

  if (flags.length === 0) {
    flags.push("none");
  }

  return flags;
}

function buildSurfaceQuestion(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function buildUnderlyingTensions(themes: ThemeTag[], raw: string): string[] {
  const tensions: string[] = [];

  if (themes.includes("work") && themes.includes("money")) {
    tensions.push("自己決定への欲求と、経済的安定への恐怖が同時に存在する");
  }
  if (themes.includes("loneliness") && /友達|友人/.test(raw)) {
    tensions.push("関係の有無と、関係の深さ・真実味への不満がずれている");
  }
  if (themes.includes("approval") || themes.includes("shame")) {
    tensions.push("自分で決めることと、他者に認められたいことが競合している");
  }
  if (themes.includes("happiness") && themes.includes("approval")) {
    tensions.push("外部的成功指標と、内的充実感の基準が一致していない");
  }
  if (themes.includes("aging") || themes.includes("death")) {
    tensions.push("時間の不可逆性と、いまの生き方の未確定さが重なっている");
  }
  if (themes.includes("creativity")) {
    tensions.push("表現したい衝動と、意味や正当性への疑念が同居している");
  }
  if (themes.includes("modernization")) {
    tensions.push("変化する社会環境と、自己の役割定義の更新速度がずれている");
  }

  if (tensions.length === 0) {
    tensions.push("表面の問題と、自己像・関係・時間をめぐる不安が重なっている可能性がある");
  }

  return tensions.slice(0, 4);
}

function buildPossibleHiddenQuestion(
  themes: ThemeTag[],
  raw: string,
): string {
  if (themes.includes("work") && themes.includes("money")) {
    return "失いたくないのは収入そのものか、それによって保たれている自己像なのか";
  }
  if (themes.includes("loneliness")) {
    return "求めているのは人数としての同伴か、分かってもらえる感覚か";
  }
  if (/SNS/.test(raw)) {
    return "見続けることで埋めようとしているのは、退屈か、承認か、取り残される恐れか";
  }
  if (themes.includes("happiness")) {
    return "「成功」の定義を誰から借りているのか、自分の幸福の定義はどこにあるのか";
  }
  if (themes.includes("aging")) {
    return "恐れているのは身体の変化か、役割の縮小か、物語の未完成か";
  }
  if (themes.includes("love") && themes.includes("family")) {
    return "後悔を恐れているのか、正解を誰かに保証してほしいのか";
  }
  if (themes.includes("approval") || themes.includes("shame")) {
    return "気になる視線は、具体的な誰かの評価か、自分の中の監視者か";
  }
  if (themes.includes("creativity")) {
    return "作りたい衝動は残っているのに、何に対して意味を証明しようとしているのか";
  }
  if (themes.includes("death")) {
    return "問われているのは死そのものか、いまの生き方に根拠を持てない感覚か";
  }
  return "この相談の奥で、実際に守ろうとしているものは何か";
}

export function analyzeQuestion(rawQuestion: string): QuestionAnalysis {
  const cleaned = rawQuestion.trim();
  const relevantThemes = detectThemes(cleaned);
  const safetyFlags = detectSafetyFlags(cleaned);

  const socialLayer = relevantThemes.some((t) =>
    ["work", "society", "money", "modernization", "obligation"].includes(t),
  )
    ? "社会的役割・制度・評価との摩擦"
    : undefined;

  const intimacyLayer = relevantThemes.some((t) =>
    ["loneliness", "love", "family", "intimacy", "approval"].includes(t),
  )
    ? "他者との距離・承認・親密さ"
    : undefined;

  const selfLayer = relevantThemes.some((t) =>
    ["self", "shame", "happiness", "creativity", "independence"].includes(t),
  )
    ? "自己像・羞恥・意味・自立"
    : undefined;

  const timeLayer = relevantThemes.some((t) =>
    ["aging", "death", "fear"].includes(t),
  )
    ? "将来・老い・有限性"
    : undefined;

  return {
    rawQuestion: cleaned,
    surfaceQuestion: buildSurfaceQuestion(cleaned),
    underlyingTensions: buildUnderlyingTensions(relevantThemes, cleaned),
    possibleHiddenQuestion: buildPossibleHiddenQuestion(relevantThemes, cleaned),
    relevantThemes,
    socialLayer,
    intimacyLayer,
    selfLayer,
    timeLayer,
    confidence: Math.min(0.55 + relevantThemes.length * 0.05, 0.9),
    safetyFlags,
  };
}
