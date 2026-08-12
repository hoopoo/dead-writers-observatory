import type { QuestionAnalysis } from "@/types/question-analysis";
import type { WriterPerspective } from "@/types/perspective";
import type { ThreeVoicesAnalysis } from "@/types/comparison";

const MODERN_BLIND_SPOTS = [
  "AI・アルゴリズム・SNSの報酬設計を、彼らが直接経験していない",
  "現代の雇用制度、非正規労働、スタートアップ経済の細部を知りえない",
  "現代医療・精神医療・カウンセリング制度を専門知として語れない",
  "現代の家族制度・ジェンダー規範・法制度をそのまま適用できない",
  "現代の金融・社会保障・キャリア市場の事実判断を代替できない",
];

function buildSharedConcerns(
  analysis: QuestionAnalysis,
  perspectives: WriterPerspective[],
): string[] {
  const concerns: string[] = [];
  const themes = new Set(analysis.relevantThemes);

  if (themes.has("self") || themes.has("happiness") || themes.has("approval")) {
    concerns.push(
      "三人とも、表面の選択問題より先に、いまの自己像が揺らいでいる地点を問題として見ている",
    );
  }

  if (themes.has("loneliness") || themes.has("intimacy") || themes.has("love")) {
    concerns.push(
      "人数や制度の有無だけでなく、関係の質と、そこに自分を置けているかを問う点で重なる",
    );
  }

  if (themes.has("work") || themes.has("money") || themes.has("society")) {
    concerns.push(
      "外的条件（仕事・金銭・社会）と内的条件（自我・不安・羞恥）を分けて見る必要性で一致する",
    );
  }

  if (themes.has("death") || themes.has("aging")) {
    concerns.push(
      "有限性への恐れを、単なる恐怖として片づけるのではなく、生き方の問いへ戻そうとする",
    );
  }

  if (concerns.length === 0) {
    concerns.push(
      "三人とも、相談を単一の正解問題としてではなく、見る場所の違いが現れる問いとして扱っている",
    );
  }

  // Ensure we acknowledge all three voices were produced.
  if (perspectives.length === 3) {
    concerns.push(
      "いずれも「本人の回答」ではなく、残された言葉と現在の問いの再接続として提示されている",
    );
  }

  return concerns.slice(0, 3);
}

function buildReturnedQuestion(analysis: QuestionAnalysis): string {
  const themes = analysis.relevantThemes;
  const raw = analysis.rawQuestion;

  // Priority follows the surface situation, not mere theme frequency.
  if (themes.includes("death") || /死/.test(raw)) {
    return "問われているのは死そのものでしょうか。それとも、いまの生き方に根拠を持てない感覚でしょうか。必要なら、文学の外の支援にもつながってください。";
  }
  if (themes.includes("work") && (themes.includes("money") || themes.includes("independence"))) {
    return "あなたが失うのを最も恐れているのは、収入でしょうか。肩書でしょうか。それとも、これまでの自分についての物語でしょうか。";
  }
  if (/結婚|恋愛|恋人/.test(raw) || (themes.includes("love") && themes.includes("family"))) {
    return "恐れているのは将来の後悔そのものでしょうか。それとも、今の選択を誰かに正しいと保証してほしい気持ちでしょうか。";
  }
  if (themes.includes("loneliness") || /孤独|友達/.test(raw)) {
    return "いま欲しいのは、そばにいる人の人数でしょうか。それとも、分かってもらえると感じられる関係でしょうか。";
  }
  if (themes.includes("happiness") || /幸福|幸せ|成功しているはず/.test(raw)) {
    return "「成功」の定義を誰から借りていますか。あなた自身の幸福の定義は、どこにありますか。";
  }
  if (themes.includes("creativity") || /作|意味/.test(raw)) {
    return "作りたい衝動は残っていますか。それとも、意味を証明できないと動けない状態になっているのでしょうか。";
  }
  if (themes.includes("aging") || /歳|老/.test(raw)) {
    return "歳を取ること自体が怖いのでしょうか。それとも、まだ生きていない自分の物語が残っている感覚でしょうか。";
  }
  if (themes.includes("modernization") || /AI|SNS/.test(raw)) {
    if (/SNS/.test(raw)) {
      return "見続けることで埋めようとしているのは、退屈でしょうか。承認でしょうか。それとも、取り残される恐れでしょうか。";
    }
    return "変化を恐れているのは技術そのものでしょうか。それとも、自分の役割が無効になる感覚でしょうか。";
  }
  if (themes.includes("approval") || themes.includes("shame") || /見られ/.test(raw)) {
    return "気になっている視線は、具体的な誰かの評価でしょうか。それとも、自分の中で監視を続ける声でしょうか。";
  }

  return analysis.possibleHiddenQuestion.endsWith("か")
    ? analysis.possibleHiddenQuestion + "。"
    : analysis.possibleHiddenQuestion + "でしょうか。";
}

export function comparePerspectives(
  analysis: QuestionAnalysis,
  perspectives: WriterPerspective[],
): ThreeVoicesAnalysis {
  const byId = Object.fromEntries(
    perspectives.map((p) => [p.personId, p]),
  );

  const differentFocuses = [
    {
      personName: byId["person-soseki"]?.personName ?? "夏目漱石",
      focus: "社会との関係・役割・金銭・義務の摩擦を見る",
    },
    {
      personName: byId["person-akutagawa"]?.personName ?? "芥川龍之介",
      focus: "思考が苦痛を増幅していないか、観察の過剰を見る",
    },
    {
      personName: byId["person-dazai"]?.personName ?? "太宰治",
      focus: "他者からの承認や許しを求めていないか、羞恥と親密さを見る",
    },
  ];

  const tensionsBetweenVoices = [
    "漱石が制度と自我の配置を問うのに対し、芥川は意識の増幅を、太宰は関係の中の羞恥を優先する",
    "同じ「怖い」でも、社会的損失・思考の先取り・見捨てられ不安のどれとして読むかで処方が分かれる（ただし本サービスは処方しない）",
    "三人の交点は自己像の動揺だが、そこから外へ出るか（社会）、内へ入るか（意識）、関係へ向かうか（親密さ）が分岐する",
  ];

  const blindSpots = [...MODERN_BLIND_SPOTS];
  if (analysis.relevantThemes.includes("modernization")) {
    blindSpots.unshift(
      "AIやSNSを、彼らの近代化批判や神経描写へ安易に重ねて現代の事実判断に使うことはできない",
    );
  }
  if (
    analysis.safetyFlags.includes("death_theme") ||
    analysis.safetyFlags.includes("self_harm_adjacent")
  ) {
    blindSpots.unshift(
      "死や生の主題について、彼らは現代の危機介入・医療・支援制度の専門家ではない",
    );
  }

  return {
    sharedConcerns: buildSharedConcerns(analysis, perspectives),
    differentFocuses,
    tensionsBetweenVoices,
    blindSpots: blindSpots.slice(0, 5),
    returnedQuestion: buildReturnedQuestion(analysis),
    provenanceMap: {
      sharedConcerns: "AI INFERENCE",
      differentFocuses: "AI INFERENCE",
      tensionsBetweenVoices: "AI INFERENCE",
      blindSpots: "AI INFERENCE",
      returnedQuestion: "AI INFERENCE",
    },
  };
}
