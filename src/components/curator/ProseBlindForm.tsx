"use client";

import { useState, useTransition } from "react";
import { saveProseBlindEvaluationAction } from "@/app/curator/actions";
import type { IndependentProseBlindEvaluation } from "@/types/public";

const PREFERRED = ["a", "b", "same", "unclear"] as const;
const MEANING = ["none", "minor", "material", "unclear"] as const;
const SAFE = ["yes", "no", "unclear"] as const;
const TRI = ["a", "b", "same"] as const;

export function ProseBlindForm(props: {
  fixtureId: string;
  personId: string;
  existing?: IndependentProseBlindEvaluation | null;
}) {
  const revealed = Boolean(props.existing);
  const [preferred, setPreferred] = useState<
    IndependentProseBlindEvaluation["preferred"]
  >(props.existing?.preferred ?? "same");
  const [meaningDifference, setMeaningDifference] = useState<
    IndependentProseBlindEvaluation["meaningDifference"]
  >(props.existing?.meaningDifference ?? "none");
  const [attributionSafe, setAttributionSafe] = useState<
    IndependentProseBlindEvaluation["attributionSafe"]
  >(props.existing?.attributionSafe ?? "yes");
  const [feelsMoreReadable, setFeelsMoreReadable] = useState<
    IndependentProseBlindEvaluation["feelsMoreReadable"]
  >(props.existing?.feelsMoreReadable ?? "same");
  const [feelsMoreUseful, setFeelsMoreUseful] = useState<
    IndependentProseBlindEvaluation["feelsMoreUseful"]
  >(props.existing?.feelsMoreUseful ?? "same");
  const [notes, setNotes] = useState(props.existing?.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveProseBlindEvaluationAction({
            fixtureId: props.fixtureId,
            personId: props.personId,
            preferred: preferred as IndependentProseBlindEvaluation["preferred"],
            meaningDifference:
              meaningDifference as IndependentProseBlindEvaluation["meaningDifference"],
            attributionSafe:
              attributionSafe as IndependentProseBlindEvaluation["attributionSafe"],
            feelsMoreReadable:
              feelsMoreReadable as IndependentProseBlindEvaluation["feelsMoreReadable"],
            feelsMoreUseful:
              feelsMoreUseful as IndependentProseBlindEvaluation["feelsMoreUseful"],
            notes: notes || undefined,
          });
          setMessage(result.ok ? "Saved" : result.error);
        });
      }}
    >
      <p className="eyebrow">INDEPENDENT BLIND CHECK</p>
      <p className="panel__lede">
        文章化したことで、意味を増やさずに読みやすくなったか。SET の由来は保存後にだけ表示します。
      </p>
      <label>
        Preferred
        <select
          value={preferred}
          onChange={(e) =>
            setPreferred(
              e.target.value as IndependentProseBlindEvaluation["preferred"],
            )
          }
        >
          {PREFERRED.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Meaning difference
        <select
          value={meaningDifference}
          onChange={(e) =>
            setMeaningDifference(
              e.target
                .value as IndependentProseBlindEvaluation["meaningDifference"],
            )
          }
        >
          {MEANING.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Attribution safe
        <select
          value={attributionSafe}
          onChange={(e) =>
            setAttributionSafe(
              e.target
                .value as IndependentProseBlindEvaluation["attributionSafe"],
            )
          }
        >
          {SAFE.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        More readable
        <select
          value={feelsMoreReadable}
          onChange={(e) =>
            setFeelsMoreReadable(
              e.target
                .value as IndependentProseBlindEvaluation["feelsMoreReadable"],
            )
          }
        >
          {TRI.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        More useful
        <select
          value={feelsMoreUseful}
          onChange={(e) =>
            setFeelsMoreUseful(
              e.target
                .value as IndependentProseBlindEvaluation["feelsMoreUseful"],
            )
          }
        >
          {TRI.map((v) => (
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
        Save blind review
      </button>
      {message ? <p className="meta-label">{message}</p> : null}
      {revealed && props.existing ? (
        <p className="meta-label">
          Revealed: A = {props.existing.assignment.a} · B ={" "}
          {props.existing.assignment.b}
        </p>
      ) : (
        <p className="meta-label">A/B identity is hidden until saved.</p>
      )}
    </form>
  );
}
