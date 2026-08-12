import type { SourcePassage } from "@/types/source-passage";
import type { AuthorialDistance } from "@/types/thought-fragment";

const WORK_VOICES = new Set([
  "narrator",
  "fictional_character",
  "dialogue",
]);

export function VoiceWarnings({
  passage,
  distance,
}: {
  passage: SourcePassage;
  distance: AuthorialDistance;
}) {
  const warnings: Array<{ title: string; body: string }> = [];

  if (WORK_VOICES.has(passage.voiceType)) {
    warnings.push({
      title: "WORK VOICE",
      body: "この文章は作品内の語り・人物の声です。作者本人の直接発言として扱わないでください。",
    });
  }

  if (
    passage.voiceType === "autobiographical" ||
    distance === "near"
  ) {
    warnings.push({
      title: "NEAR AUTHORIAL EVIDENCE",
      body: "作者本人による記述ですが、自伝的記述をそのまま客観的事実とは扱いません。",
    });
  }

  if (
    distance === "direct" &&
    passage.isAuthorDirectStatement &&
    !WORK_VOICES.has(passage.voiceType)
  ) {
    warnings.push({
      title: "DIRECT AUTHOR STATEMENT",
      body: "作者本人による直接的な発言です。これは、作者がそう述べたことの証拠です。内容そのものの客観的真実を保証するものではありません。",
    });
  }

  if (warnings.length === 0) return null;

  return (
    <div className="curator-warnings">
      {warnings.map((warning) => (
        <aside key={warning.title} className="curator-warning">
          <p className="eyebrow">{warning.title}</p>
          <p>{warning.body}</p>
        </aside>
      ))}
    </div>
  );
}
