"use client";

import { useState } from "react";
import type { PerspectiveEvidence } from "@/types/evidence";
import { AUTHORIAL_DISTANCE_LABELS } from "@/lib/archive-distance-labels";
import { ProvenanceBadge } from "./ProvenanceBadge";

export function SourceEvidenceCard({ evidence }: { evidence: PerspectiveEvidence }) {
  const [open, setOpen] = useState(false);
  const distance = AUTHORIAL_DISTANCE_LABELS[evidence.authorialDistance];
  const statusLabel =
    evidence.verificationStatus === "verified"
      ? "VERIFIED TEXT"
      : evidence.verificationStatus.toUpperCase();

  return (
    <article className="evidence-card">
      <header className="evidence-card__header">
        <div>
          <p className="evidence-card__title">『{evidence.sourceTitle}』</p>
          <p className="evidence-card__meta">
            {evidence.sourceType} · {statusLabel}
          </p>
        </div>
        <ProvenanceBadge label={evidence.provenance} />
      </header>

      <dl className="evidence-dl">
        <div>
          <dt>Voice</dt>
          <dd>{evidence.voiceLabelJa}</dd>
        </div>
        <div>
          <dt>Relationship</dt>
          <dd>{evidence.relationshipLabelJa}</dd>
        </div>
        <div>
          <dt>Authorial distance</dt>
          <dd>
            <span className={`distance-pill distance-${evidence.authorialDistance}`}>
              {distance.en}
            </span>
            <span className="distance-ja">{distance.ja}</span>
          </dd>
        </div>
        <div>
          <dt>Archive status</dt>
          <dd>{(evidence.reviewStatus ?? "none").toUpperCase()}</dd>
        </div>
        <div>
          <dt>Locator</dt>
          <dd>{evidence.locatorLabel}</dd>
        </div>
      </dl>

      <p className="evidence-card__meaning">
        <span className="meta-label">Archive interpretation</span>
        {evidence.normalizedMeaning}
      </p>

      {evidence.sourceText ? (
        <div className="evidence-expand">
          <button
            type="button"
            className="evidence-expand__button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            {open ? "原文を閉じる" : "原文を見る"}
          </button>
          {open ? (
            <div className="evidence-expand__body">
              <p className="meta-label">Source text</p>
              {evidence.contextBefore ? (
                <p className="evidence-context">{evidence.contextBefore}</p>
              ) : null}
              <blockquote className="evidence-quote">{evidence.sourceText}</blockquote>
              {evidence.contextAfter ? (
                <p className="evidence-context">{evidence.contextAfter}</p>
              ) : null}
              <p className="evidence-card__biblio">{evidence.bibliographicReference}</p>
              <p className="evidence-card__biblio">
                Voice: {evidence.voiceLabelJa} / Distance: {distance.en} ({distance.ja})
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="evidence-card__biblio">
          原文未収録（{evidence.bibliographicReference}）
        </p>
      )}
    </article>
  );
}
