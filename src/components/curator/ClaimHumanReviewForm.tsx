"use client";

import { useState, useTransition } from "react";
import { saveClaimHumanEvaluationAction } from "@/app/curator/actions";
import type {
  ClaimHumanEvaluation,
  ClaimHumanReasonTag,
} from "@/types/perspective-claim";

const EVIDENCE = [
  "supported",
  "too-strong",
  "too-weak",
  "misattributed",
  "unclear",
] as const;

const USEFULNESS = [
  "useful",
  "obvious",
  "not-useful",
  "surprising-but-defensible",
  "unclear",
] as const;

const STRENGTH = [
  "appropriate",
  "too-cautious",
  "too-certain",
  "unclear",
] as const;

const REASON_TAGS: ClaimHumanReasonTag[] = [
  "well-grounded",
  "evidence-too-thin",
  "authorial-overreach",
  "work-voice-risk",
  "historical-overreach",
  "modern-transfer-clear",
  "too-generic",
  "too-obvious",
  "opens-new-angle",
  "useful-tension",
  "good-cross-source-synthesis",
  "weak-cross-source-synthesis",
  "too-cautious",
  "too-certain",
  "repetitive",
  "historically-interesting",
  "other",
];

export function ClaimHumanReviewForm(props: {
  claimId: string;
  fixtureId: string;
  personId: string;
  existing?: ClaimHumanEvaluation | null;
}) {
  const [evidenceVerdict, setEvidenceVerdict] = useState<
    ClaimHumanEvaluation["evidenceVerdict"] | ""
  >(props.existing?.evidenceVerdict ?? "");
  const [usefulnessVerdict, setUsefulnessVerdict] = useState<
    ClaimHumanEvaluation["usefulnessVerdict"] | ""
  >(props.existing?.usefulnessVerdict ?? "");
  const [strengthVerdict, setStrengthVerdict] = useState<
    ClaimHumanEvaluation["strengthVerdict"] | ""
  >(props.existing?.strengthVerdict ?? "");
  const [tags, setTags] = useState<ClaimHumanReasonTag[]>(
    props.existing?.reasonTags ?? [],
  );
  const [notes, setNotes] = useState(props.existing?.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleTag(tag: ClaimHumanReasonTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function onSave() {
    if (!evidenceVerdict || !usefulnessVerdict || !strengthVerdict) {
      setMessage("Evidence / Usefulness / Strength をすべて選択してください。");
      return;
    }
    startTransition(async () => {
      const result = await saveClaimHumanEvaluationAction({
        claimId: props.claimId,
        fixtureId: props.fixtureId,
        personId: props.personId,
        evidenceVerdict,
        usefulnessVerdict,
        strengthVerdict,
        reasonTags: tags,
        notes: notes.trim() || undefined,
      });
      setMessage(result.ok ? "Saved human claim review." : result.error);
    });
  }

  return (
    <div className="claim-human-review">
      <p className="eyebrow">HUMAN REVIEW</p>

      <p className="eyebrow">IS THIS CLAIM SUPPORTED BY THE EVIDENCE?</p>
      <div className="verdict-buttons">
        {EVIDENCE.map((item) => (
          <button
            key={item}
            type="button"
            className={evidenceVerdict === item ? "is-active" : undefined}
            onClick={() => setEvidenceVerdict(item)}
          >
            {item.replace(/-/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      <p className="eyebrow">DOES THIS CLAIM HELP RE-READ THE QUESTION?</p>
      <div className="verdict-buttons">
        {USEFULNESS.map((item) => (
          <button
            key={item}
            type="button"
            className={usefulnessVerdict === item ? "is-active" : undefined}
            onClick={() => setUsefulnessVerdict(item)}
          >
            {item.replace(/-/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      <p className="eyebrow">IS THE CLAIM STATED AT THE RIGHT STRENGTH?</p>
      <div className="verdict-buttons">
        {STRENGTH.map((item) => (
          <button
            key={item}
            type="button"
            className={strengthVerdict === item ? "is-active" : undefined}
            onClick={() => setStrengthVerdict(item)}
          >
            {item.replace(/-/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      <p className="eyebrow">REASON TAGS</p>
      <ul className="reason-tag-list">
        {REASON_TAGS.map((tag) => (
          <li key={tag}>
            <label>
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={() => toggleTag(tag)}
              />
              {tag}
            </label>
          </li>
        ))}
      </ul>

      <label className="notes-field">
        <span className="eyebrow">NOTES</span>
        <textarea
          value={notes}
          rows={2}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="curator-primary"
        disabled={pending}
        onClick={onSave}
      >
        {pending ? "Saving…" : "Save claim review"}
      </button>
      {message ? <p className="panel__lede">{message}</p> : null}
    </div>
  );
}
