"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const PLACEHOLDERS = [
  "会社を辞めたい。でも怖い。",
  "友達はいるのに孤独です。",
  "成功しているはずなのに、幸福だと思えません。",
  "SNSを見るのをやめられません。",
  "AIに仕事を奪われるのが怖いです。",
  "歳を取ることが怖いです。",
];

export function QuestionForm({
  initialValue = "",
}: {
  initialValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/observe?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className="question-form" onSubmit={onSubmit}>
      <label htmlFor="question" className="question-form__label">
        いま、何を考えていますか？
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
        <button type="submit" className="button-primary">
          三人の視点で読む
        </button>
      </div>
    </form>
  );
}
