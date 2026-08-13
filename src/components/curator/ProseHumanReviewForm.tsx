"use client";

import { useState, useTransition } from "react";
import { saveProseHumanEvaluationAction } from "@/app/curator/actions";
import type { ProseHumanEvaluation } from "@/types/prose";

const FIDELITY = ["preserved", "minor-drift", "major-drift", "unclear"] as const;
const TRI = ["better", "same", "worse", "unclear"] as const;
const DIST = ["preserved", "weakened", "lost", "unclear"] as const;

export function ProseHumanReviewForm(props: {
  proseId: string;
  fixtureId: string;
  personId: string;
  existing?: ProseHumanEvaluation | null;
}) {
  const [fidelity, setFidelity] = useState<string>(
    props.existing?.fidelity ?? "preserved",
  );
  const [readability, setReadability] = useState<string>(
    props.existing?.readability ?? "same",
  );
  const [usefulness, setUsefulness] = useState<string>(
    props.existing?.usefulness ?? "same",
  );
  const [distinctiveness, setDistinctiveness] = useState<string>(
    props.existing?.distinctiveness ?? "preserved",
  );
  const [notes, setNotes] = useState(props.existing?.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveProseHumanEvaluationAction({
            proseId: props.proseId,
            fixtureId: props.fixtureId,
            personId: props.personId,
            fidelity: fidelity as ProseHumanEvaluation["fidelity"],
            readability: readability as ProseHumanEvaluation["readability"],
            usefulness: usefulness as ProseHumanEvaluation["usefulness"],
            distinctiveness:
              distinctiveness as ProseHumanEvaluation["distinctiveness"],
            notes: notes || undefined,
          });
          setMessage(result.ok ? "Saved" : result.error);
        });
      }}
    >
      <p className="eyebrow">HUMAN PROSE REVIEW</p>
      <p className="panel__lede">
        文章化したことで、意味を増やさずに読みやすくなったか。
      </p>
      <label>
        Fidelity
        <select value={fidelity} onChange={(e) => setFidelity(e.target.value)}>
          {FIDELITY.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Readability
        <select
          value={readability}
          onChange={(e) => setReadability(e.target.value)}
        >
          {TRI.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Usefulness
        <select
          value={usefulness}
          onChange={(e) => setUsefulness(e.target.value)}
        >
          {TRI.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Distinctiveness
        <select
          value={distinctiveness}
          onChange={(e) => setDistinctiveness(e.target.value)}
        >
          {DIST.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="submit" className="button-secondary" disabled={pending}>
        Save review
      </button>
      {message ? <p className="meta-label">{message}</p> : null}
    </form>
  );
}
