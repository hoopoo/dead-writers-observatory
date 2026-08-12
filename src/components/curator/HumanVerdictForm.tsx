"use client";

import { useMemo, useState, useTransition } from "react";
import { saveRetrievalHumanEvaluationAction } from "@/app/curator/actions";
import type {
  CandidateEvaluationMode,
  RetrievalHumanEvaluation,
  RetrievalHumanReasonTag,
  RetrievalHumanVerdict,
} from "@/types/embedding";

const REASON_TAGS: RetrievalHumanReasonTag[] = [
  "more-relevant",
  "better-modern-connection",
  "better-source-diversity",
  "better-authorial-balance",
  "better-historical-fit",
  "better-context",
  "too-literal",
  "too-associative",
  "wrong-context",
  "source-collapse",
  "distance-collapse",
  "less-relevant",
  "other",
];

const VERDICTS: RetrievalHumanVerdict[] = [
  "better",
  "same",
  "worse",
  "unclear",
];

export function HumanVerdictForm(props: {
  fixtureId: string;
  personId: string;
  candidateMode: CandidateEvaluationMode;
  candidatePassageIds: string[];
  existing?: RetrievalHumanEvaluation | null;
  blindLeftMode?: "deterministic" | CandidateEvaluationMode;
  blindRightMode?: "deterministic" | CandidateEvaluationMode;
}) {
  const [verdict, setVerdict] = useState<RetrievalHumanVerdict | "">(
    props.existing?.verdict ?? "",
  );
  const [tags, setTags] = useState<RetrievalHumanReasonTag[]>(
    props.existing?.reasonTags ?? [],
  );
  const [preferred, setPreferred] = useState<string[]>(
    props.existing?.preferredPassageIds ?? [],
  );
  const [notes, setNotes] = useState(props.existing?.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tagChoices = useMemo(() => REASON_TAGS, []);

  function toggleTag(tag: RetrievalHumanReasonTag) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function togglePreferred(passageId: string) {
    setPreferred((prev) =>
      prev.includes(passageId)
        ? prev.filter((id) => id !== passageId)
        : [...prev, passageId],
    );
  }

  function onSubmit() {
    if (!verdict) {
      setMessage("Select a verdict first.");
      return;
    }
    startTransition(async () => {
      const result = await saveRetrievalHumanEvaluationAction({
        fixtureId: props.fixtureId,
        personId: props.personId,
        candidateMode: props.candidateMode,
        verdict,
        reasonTags: tags,
        preferredPassageIds: preferred,
        notes: notes.trim() || undefined,
        blindLeftMode: props.blindLeftMode,
        blindRightMode: props.blindRightMode,
      });
      setMessage(result.ok ? "Saved human verdict." : result.error);
    });
  }

  return (
    <div className="human-verdict">
      <p className="eyebrow">HUMAN VERDICT</p>
      <h3>Which evidence set better illuminates this question?</h3>
      <p className="panel__lede">
        Candidate = {props.candidateMode}. Judge usefulness of the evidence set,
        not writer stereotype or literary style.
      </p>

      <div className="verdict-buttons">
        {VERDICTS.map((item) => (
          <button
            key={item}
            type="button"
            className={verdict === item ? "is-active" : undefined}
            onClick={() => setVerdict(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      <p className="eyebrow" style={{ marginTop: "1.25rem" }}>
        WHY? (reason tags)
      </p>
      <ul className="reason-tag-list">
        {tagChoices.map((tag) => (
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

      {props.candidatePassageIds.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: "1.25rem" }}>
            PREFERRED PASSAGES (optional)
          </p>
          <ul className="reason-tag-list">
            {props.candidatePassageIds.map((passageId) => (
              <li key={passageId}>
                <label>
                  <input
                    type="checkbox"
                    checked={preferred.includes(passageId)}
                    onChange={() => togglePreferred(passageId)}
                  />
                  {passageId}
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <label className="notes-field">
        <span className="eyebrow">NOTES</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />
      </label>

      <button
        type="button"
        className="curator-primary"
        disabled={pending}
        onClick={onSubmit}
      >
        {pending ? "Saving…" : "Save verdict"}
      </button>
      {message ? <p className="panel__lede">{message}</p> : null}
    </div>
  );
}
