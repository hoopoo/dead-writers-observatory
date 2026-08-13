"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const PLACEHOLDERS = [
  "仕事を辞めたいけれど、収入がなくなるのが怖い。",
  "友達はいるのに、なぜか孤独です。",
  "SNSを見るのをやめたいのに、つい見てしまいます。",
  "AIに自分の仕事を奪われる気がします。",
];

export function QuestionForm({
  initialValue = "",
}: {
  initialValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    router.push(`/observe?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="question-form" onSubmit={onSubmit}>
      <label htmlFor="question" className="question-form__label">
        いま、何が気になっていますか？
      </label>
      <textarea
        id="question"
        name="question"
        className="question-form__textarea"
        rows={5}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={PLACEHOLDERS[placeholderIndex]}
        onFocus={() =>
          setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length)
        }
        required
      />
      <div className="question-form__actions">
        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? "資料を探しています" : "3つの資料群で読む"}
        </button>
      </div>
    </form>
  );
}
