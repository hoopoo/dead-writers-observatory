import { randomUUID } from "node:crypto";
import {
  getFragmentReview as getStaticFragmentReview,
  fragmentReviews as staticFragmentReviews,
} from "@/data/reviews/fragments";
import {
  getPassageReview as getStaticPassageReview,
  passageReviews as staticPassageReviews,
} from "@/data/reviews/passages";
import { evaluatePassageApproveGate, summarizeReviewForEvent } from "@/lib/review/approve-gate";
import { getReviewDb } from "@/lib/review/db";
import { assertTransition } from "@/lib/review/transitions";
import type {
  ArchiveReviewRepository,
  PassageReview,
  PassageReviewUpdate,
  ReviewActor,
  ReviewEvent,
  ReviewEventAction,
  ReviewEventInput,
  ReviewStatus,
  ReviewTargetType,
  ThoughtFragmentReview,
  ThoughtFragmentReviewUpdate,
} from "@/types/review";
import { DEFAULT_REVIEW_ACTOR, MIGRATION_ACTOR } from "@/types/review";

type PassageRow = {
  passage_id: string;
  review_status: ReviewStatus;
  text_verified: number;
  locator_verified: number;
  voice_verified: number;
  authorial_distance_verified: number;
  source_relationship_verified: number;
  fragment_meaning_verified: number;
  issues_json: string;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  notes: string | null;
  updated_at: string;
};

type FragmentRow = {
  fragment_id: string;
  meaning_supported: ThoughtFragmentReview["meaningSupportedByPassage"];
  overclaim_risk: ThoughtFragmentReview["overclaimRisk"];
  notes: string | null;
  updated_at: string;
};

type EventRow = {
  id: string;
  target_type: ReviewTargetType;
  target_id: string;
  action: ReviewEventAction;
  actor_id: string;
  actor_name: string;
  actor_type: ReviewActor["type"];
  previous_state_json: string | null;
  next_state_json: string | null;
  timestamp: string;
  notes: string | null;
};

function rowToPassage(row: PassageRow): PassageReview {
  return {
    id: `review-${row.passage_id}`,
    passageId: row.passage_id,
    reviewStatus: row.review_status,
    checks: {
      textVerified: Boolean(row.text_verified),
      locatorVerified: Boolean(row.locator_verified),
      voiceVerified: Boolean(row.voice_verified),
      authorialDistanceVerified: Boolean(row.authorial_distance_verified),
      sourceRelationshipVerified: Boolean(row.source_relationship_verified),
      fragmentMeaningVerified: Boolean(row.fragment_meaning_verified),
    },
    issues: JSON.parse(row.issues_json) as string[],
    reviewer: row.reviewer_name ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function rowToFragment(row: FragmentRow): ThoughtFragmentReview {
  return {
    fragmentId: row.fragment_id,
    meaningSupportedByPassage: row.meaning_supported,
    overclaimRisk: row.overclaim_risk,
    notes: row.notes ?? undefined,
  };
}

function rowToEvent(row: EventRow): ReviewEvent {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    action: row.action,
    actor: {
      id: row.actor_id,
      displayName: row.actor_name,
      type: row.actor_type,
    },
    previousState: row.previous_state_json
      ? (JSON.parse(row.previous_state_json) as unknown)
      : undefined,
    nextState: row.next_state_json
      ? (JSON.parse(row.next_state_json) as unknown)
      : undefined,
    timestamp: row.timestamp,
    notes: row.notes ?? undefined,
  };
}

function actionForStatus(
  status: ReviewStatus,
  previous?: ReviewStatus,
): ReviewEventAction {
  if (previous === "rejected" && status === "approved") return "restored";
  if (status === "approved") return "approved";
  if (status === "needs-review") return "needs-review";
  if (status === "rejected") return "rejected";
  return "updated";
}

function defaultPassage(passageId: string): PassageReview {
  const staticReview = getStaticPassageReview(passageId);
  if (staticReview) return structuredClone(staticReview);
  return {
    id: `review-${passageId}`,
    passageId,
    reviewStatus: "pending",
    checks: {
      textVerified: false,
      locatorVerified: false,
      voiceVerified: false,
      authorialDistanceVerified: false,
      sourceRelationshipVerified: false,
      fragmentMeaningVerified: false,
    },
    issues: ["review missing"],
  };
}

function defaultFragment(fragmentId: string): ThoughtFragmentReview {
  const staticReview = getStaticFragmentReview(fragmentId);
  if (staticReview) return structuredClone(staticReview);
  return {
    fragmentId,
    meaningSupportedByPassage: "unclear",
    overclaimRisk: "medium",
    notes: "review missing",
  };
}

export class SqliteArchiveReviewRepository implements ArchiveReviewRepository {
  private readPassage(passageId: string): PassageReview | null {
    const row = getReviewDb()
      .prepare(`SELECT * FROM passage_reviews WHERE passage_id = ?`)
      .get(passageId) as PassageRow | undefined;
    return row ? rowToPassage(row) : null;
  }

  private readFragment(fragmentId: string): ThoughtFragmentReview | null {
    const row = getReviewDb()
      .prepare(`SELECT * FROM fragment_reviews WHERE fragment_id = ?`)
      .get(fragmentId) as FragmentRow | undefined;
    return row ? rowToFragment(row) : null;
  }

  async getPassageReview(passageId: string): Promise<PassageReview | null> {
    return this.readPassage(passageId) ?? getStaticPassageReview(passageId) ?? null;
  }

  async getFragmentReview(
    fragmentId: string,
  ): Promise<ThoughtFragmentReview | null> {
    return (
      this.readFragment(fragmentId) ?? getStaticFragmentReview(fragmentId) ?? null
    );
  }

  getPassageReviewSync(passageId: string): PassageReview | null {
    return this.readPassage(passageId) ?? getStaticPassageReview(passageId) ?? null;
  }

  getFragmentReviewSync(fragmentId: string): ThoughtFragmentReview | null {
    return (
      this.readFragment(fragmentId) ?? getStaticFragmentReview(fragmentId) ?? null
    );
  }

  async appendReviewEvent(event: ReviewEventInput): Promise<ReviewEvent> {
    const full: ReviewEvent = {
      id: randomUUID(),
      targetType: event.targetType,
      targetId: event.targetId,
      action: event.action,
      actor: event.actor,
      previousState: event.previousState,
      nextState: event.nextState,
      timestamp: event.timestamp ?? new Date().toISOString(),
      notes: event.notes,
    };
    getReviewDb()
      .prepare(
        `INSERT INTO review_events (
          id, target_type, target_id, action,
          actor_id, actor_name, actor_type,
          previous_state_json, next_state_json, timestamp, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        full.id,
        full.targetType,
        full.targetId,
        full.action,
        full.actor.id,
        full.actor.displayName,
        full.actor.type,
        full.previousState === undefined
          ? null
          : JSON.stringify(full.previousState),
        full.nextState === undefined ? null : JSON.stringify(full.nextState),
        full.timestamp,
        full.notes ?? null,
      );
    return full;
  }

  async getReviewEvents(
    targetType: ReviewTargetType,
    targetId: string,
  ): Promise<ReviewEvent[]> {
    const rows = getReviewDb()
      .prepare(
        `SELECT * FROM review_events
         WHERE target_type = ? AND target_id = ?
         ORDER BY timestamp DESC, id DESC`,
      )
      .all(targetType, targetId) as EventRow[];
    return rows.map(rowToEvent);
  }

  async updatePassageReview(
    passageId: string,
    update: PassageReviewUpdate,
    actor: ReviewActor = DEFAULT_REVIEW_ACTOR,
  ): Promise<PassageReview> {
    const current = this.readPassage(passageId) ?? defaultPassage(passageId);
    const nextStatus = update.reviewStatus ?? current.reviewStatus;
    assertTransition(current.reviewStatus, nextStatus);

    const nextChecks = {
      ...current.checks,
      ...update.checks,
    };

    if (nextStatus === "approved") {
      const gate = evaluatePassageApproveGate(passageId, nextChecks);
      if (!gate.ok) {
        throw new Error(`APPROVE blocked: ${gate.reasons.join("; ")}`);
      }
    }

    const next: PassageReview = {
      ...current,
      reviewStatus: nextStatus,
      checks: nextChecks,
      issues: update.issues ?? current.issues,
      notes: update.notes ?? current.notes,
      reviewer: update.reviewer ?? actor.displayName,
      reviewedAt: new Date().toISOString(),
    };

    const updatedAt = new Date().toISOString();
    getReviewDb()
      .prepare(
        `INSERT INTO passage_reviews (
          passage_id, review_status,
          text_verified, locator_verified, voice_verified,
          authorial_distance_verified, source_relationship_verified,
          fragment_meaning_verified, issues_json,
          reviewer_id, reviewer_name, reviewed_at, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(passage_id) DO UPDATE SET
          review_status = excluded.review_status,
          text_verified = excluded.text_verified,
          locator_verified = excluded.locator_verified,
          voice_verified = excluded.voice_verified,
          authorial_distance_verified = excluded.authorial_distance_verified,
          source_relationship_verified = excluded.source_relationship_verified,
          fragment_meaning_verified = excluded.fragment_meaning_verified,
          issues_json = excluded.issues_json,
          reviewer_id = excluded.reviewer_id,
          reviewer_name = excluded.reviewer_name,
          reviewed_at = excluded.reviewed_at,
          notes = excluded.notes,
          updated_at = excluded.updated_at`,
      )
      .run(
        next.passageId,
        next.reviewStatus,
        next.checks.textVerified ? 1 : 0,
        next.checks.locatorVerified ? 1 : 0,
        next.checks.voiceVerified ? 1 : 0,
        next.checks.authorialDistanceVerified ? 1 : 0,
        next.checks.sourceRelationshipVerified ? 1 : 0,
        next.checks.fragmentMeaningVerified ? 1 : 0,
        JSON.stringify(next.issues),
        actor.id,
        next.reviewer ?? actor.displayName,
        next.reviewedAt ?? null,
        next.notes ?? null,
        updatedAt,
      );

    await this.appendReviewEvent({
      targetType: "passage",
      targetId: passageId,
      action: actionForStatus(next.reviewStatus, current.reviewStatus),
      actor,
      previousState: summarizeReviewForEvent(current),
      nextState: summarizeReviewForEvent(next),
      notes: update.notes,
    });

    return next;
  }

  async updateFragmentReview(
    fragmentId: string,
    update: ThoughtFragmentReviewUpdate,
    actor: ReviewActor = DEFAULT_REVIEW_ACTOR,
  ): Promise<ThoughtFragmentReview> {
    const current = this.readFragment(fragmentId) ?? defaultFragment(fragmentId);
    const next: ThoughtFragmentReview = {
      ...current,
      ...update,
    };
    const updatedAt = new Date().toISOString();
    getReviewDb()
      .prepare(
        `INSERT INTO fragment_reviews (
          fragment_id, meaning_supported, overclaim_risk, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(fragment_id) DO UPDATE SET
          meaning_supported = excluded.meaning_supported,
          overclaim_risk = excluded.overclaim_risk,
          notes = excluded.notes,
          updated_at = excluded.updated_at`,
      )
      .run(
        next.fragmentId,
        next.meaningSupportedByPassage,
        next.overclaimRisk,
        next.notes ?? null,
        updatedAt,
      );

    await this.appendReviewEvent({
      targetType: "fragment",
      targetId: fragmentId,
      action: "updated",
      actor,
      previousState: current,
      nextState: next,
      notes: update.notes,
    });

    return next;
  }

  /**
   * Idempotent seed from static archive reviews.
   * Does not duplicate CREATED events when already seeded.
   */
  seedFromStatic(): { passages: number; fragments: number; events: number } {
    const db = getReviewDb();
    let passages = 0;
    let fragments = 0;
    let events = 0;
    const now = new Date().toISOString();

    const insertPassage = db.prepare(
      `INSERT OR IGNORE INTO passage_reviews (
        passage_id, review_status,
        text_verified, locator_verified, voice_verified,
        authorial_distance_verified, source_relationship_verified,
        fragment_meaning_verified, issues_json,
        reviewer_id, reviewer_name, reviewed_at, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const hasCreatedEvent = db.prepare(
      `SELECT id FROM review_events
       WHERE target_type = 'passage' AND target_id = ? AND action = 'created'
       LIMIT 1`,
    );

    const insertEvent = db.prepare(
      `INSERT INTO review_events (
        id, target_type, target_id, action,
        actor_id, actor_name, actor_type,
        previous_state_json, next_state_json, timestamp, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertFragment = db.prepare(
      `INSERT OR IGNORE INTO fragment_reviews (
        fragment_id, meaning_supported, overclaim_risk, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
    );

    const tx = db.transaction(() => {
      for (const review of staticPassageReviews) {
        const result = insertPassage.run(
          review.passageId,
          review.reviewStatus,
          review.checks.textVerified ? 1 : 0,
          review.checks.locatorVerified ? 1 : 0,
          review.checks.voiceVerified ? 1 : 0,
          review.checks.authorialDistanceVerified ? 1 : 0,
          review.checks.sourceRelationshipVerified ? 1 : 0,
          review.checks.fragmentMeaningVerified ? 1 : 0,
          JSON.stringify(review.issues),
          MIGRATION_ACTOR.id,
          review.reviewer ?? MIGRATION_ACTOR.displayName,
          review.reviewedAt ?? now,
          review.notes ?? null,
          now,
        );
        if (result.changes > 0) {
          passages += 1;
          if (!hasCreatedEvent.get(review.passageId)) {
            insertEvent.run(
              randomUUID(),
              "passage",
              review.passageId,
              "created",
              MIGRATION_ACTOR.id,
              MIGRATION_ACTOR.displayName,
              MIGRATION_ACTOR.type,
              null,
              JSON.stringify(summarizeReviewForEvent(review)),
              now,
              "Seeded from static review data.",
            );
            events += 1;
          }
        }
      }

      for (const review of staticFragmentReviews) {
        const result = insertFragment.run(
          review.fragmentId,
          review.meaningSupportedByPassage,
          review.overclaimRisk,
          review.notes ?? null,
          now,
        );
        if (result.changes > 0) fragments += 1;
      }
    });

    tx();
    return { passages, fragments, events };
  }
}

export const sqliteReviewRepository = new SqliteArchiveReviewRepository();
