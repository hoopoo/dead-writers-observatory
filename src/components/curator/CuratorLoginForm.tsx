"use client";

import { useState, useTransition } from "react";
import { loginCurator } from "@/app/curator/actions";

export function CuratorLoginForm({
  nextPath,
  error,
}: {
  nextPath: string;
  error?: string;
}) {
  const [token, setToken] = useState("");
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState(error ?? "");

  return (
    <form
      className="curator-login"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await loginCurator(token, nextPath);
          if (result?.error) setLocalError(result.error);
        });
      }}
    >
      <label>
        Token
        <input
          type="password"
          autoComplete="current-password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
        />
      </label>
      <button type="submit" className="button-primary" disabled={pending}>
        ENTER
      </button>
      {localError ? <p className="review-actions__note">{localError}</p> : null}
    </form>
  );
}
