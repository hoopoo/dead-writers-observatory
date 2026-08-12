"use client";

import { useState } from "react";
import type { ReviewEvent } from "@/types/review";

function statusFromState(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as { reviewStatus?: string }).reviewStatus;
  return value ?? null;
}

export function ReviewHistory({ events }: { events: ReviewEvent[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <section className="panel">
        <p className="eyebrow">REVIEW HISTORY</p>
        <p>No events yet.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <p className="eyebrow">REVIEW HISTORY</p>
      <ul className="review-history">
        {events.map((event) => {
          const prev = statusFromState(event.previousState);
          const next = statusFromState(event.nextState);
          const expanded = openId === event.id;
          return (
            <li key={event.id}>
              <button
                type="button"
                className="review-history__head"
                onClick={() => setOpenId(expanded ? null : event.id)}
              >
                <span>{new Date(event.timestamp).toLocaleString("ja-JP")}</span>
                <strong>{event.action.toUpperCase()}</strong>
                <span>{event.actor.displayName}</span>
              </button>
              {prev && next && prev !== next ? (
                <p className="review-history__diff">
                  reviewStatus {prev.toUpperCase()} → {next.toUpperCase()}
                </p>
              ) : null}
              {event.notes ? <p>{event.notes}</p> : null}
              {expanded ? (
                <pre className="review-history__json">
                  {JSON.stringify(
                    {
                      previous: event.previousState,
                      next: event.nextState,
                    },
                    null,
                    2,
                  )}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
