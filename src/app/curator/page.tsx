import Link from "next/link";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import {
  getGlobalArchiveSummary,
  listPendingArchiveWork,
} from "@/lib/curator-overview";

export default function CuratorHomePage() {
  const summary = getGlobalArchiveSummary();
  const pending = listPendingArchiveWork();

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">Archive Health</p>
        <div className="health-grid">
          {summary.health.map((item) => (
            <article key={item.personId} className="health-card">
              <h2>{item.personName}</h2>
              <dl className="stat-grid">
                <div>
                  <dt>VERIFIED</dt>
                  <dd>{item.verifiedPassages}</dd>
                </div>
                <div>
                  <dt>APPROVED</dt>
                  <dd>{item.approvedPassages}</dd>
                </div>
                <div>
                  <dt>PENDING</dt>
                  <dd>{item.unresolvedReviews}</dd>
                </div>
                <div>
                  <dt>DIRECT</dt>
                  <dd>{item.directEvidenceCount}</dd>
                </div>
                <div>
                  <dt>NEAR</dt>
                  <dd>{item.nearEvidenceCount}</dd>
                </div>
                <div>
                  <dt>INDIRECT</dt>
                  <dd>{item.indirectEvidenceCount}</dd>
                </div>
              </dl>
              <p className="readiness-chip">
                READINESS {item.readiness.toUpperCase()}
              </p>
              <Link
                className="button-secondary"
                href={`/curator/people/${item.personId}`}
              >
                OPEN ARCHIVE
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Global summary</p>
        <dl className="stat-grid stat-grid--wide">
          <div>
            <dt>Verified passages</dt>
            <dd>{summary.verified}</dd>
          </div>
          <div>
            <dt>Approved passages</dt>
            <dd>{summary.approved}</dd>
          </div>
          <div>
            <dt>Placeholder</dt>
            <dd>{summary.placeholder}</dd>
          </div>
          <div>
            <dt>Direct author evidence</dt>
            <dd>{summary.directAuthor}</dd>
          </div>
          <div>
            <dt>Work voice evidence</dt>
            <dd>{summary.workVoice}</dd>
          </div>
          <div>
            <dt>High overclaim risk</dt>
            <dd>{summary.highOverclaim}</dd>
          </div>
          <div>
            <dt>Unresolved reviews</dt>
            <dd>{summary.unresolved}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <p className="eyebrow">RAG READINESS</p>
        <p className="rag-global">{summary.rag.status}</p>
        <ul className="rag-list">
          {summary.peopleReady.map((person) => (
            <li key={person.personId}>
              <strong>{person.personName}</strong>
              <span>{person.readyForRag ? "READY" : "NOT READY"}</span>
              <em>{person.reasons.join(" / ")}</em>
            </li>
          ))}
        </ul>
        {summary.rag.reasons.length > 0 ? (
          <p className="panel__lede">理由: {summary.rag.reasons.join(" · ")}</p>
        ) : null}
      </section>

      <section className="panel">
        <p className="eyebrow">PENDING ARCHIVE WORK</p>
        {pending.length === 0 ? (
          <p>No placeholder / unresolved review queue.</p>
        ) : (
          <ul className="pending-list">
            {pending.map((item) => (
              <li key={item.passageId}>
                <div>
                  <strong>
                    {item.personName} / {item.sourceTitle}
                  </strong>
                  <p>{item.passageId}</p>
                  <p>
                    Status: {item.reasonPending} · Voice: {item.voice} ·
                    Distance: {item.distance}
                  </p>
                  <p>Themes: {item.themes.join(", ") || "—"}</p>
                  <p>Needed: {item.requiredActions.join(" · ")}</p>
                </div>
                <Link
                  className="button-secondary"
                  href={`/curator/passages/${item.passageId}`}
                >
                  REVIEW
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">HUMAN RETRIEVAL EVALUATION</p>
        <p className="panel__lede">
          Machine retrieval quality cannot replace human archival judgment.
          Compare evidence sets before enabling generation.
        </p>
        <Link className="button-secondary" href="/curator/retrieval?candidate=neural-hybrid">
          OPEN A/B RETRIEVAL EVAL
        </Link>
      </section>

      <section className="panel">
        <p className="eyebrow">EVIDENCE-BOUNDED PROSE</p>
        <p className="panel__lede">
          Do not create meaning. Preserve it while making it readable.
          Experiment B skeleton only · staging <code>?prose=1</code>
        </p>
        <Link className="button-secondary" href="/curator/prose">
          OPEN PROSE REVIEW
        </Link>
      </section>

      <section className="panel">
        <p className="eyebrow">TEST QUESTIONS</p>
        <ul className="fixture-list">
          {FIXTURE_QUESTIONS.map((fixture, index) => (
            <li key={fixture.id}>
              <div>
                <span className="fixture-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p>{fixture.question}</p>
              </div>
              <Link
                className="button-secondary"
                href={`/curator/retrieval?fixture=${fixture.id}`}
              >
                INSPECT RETRIEVAL
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
