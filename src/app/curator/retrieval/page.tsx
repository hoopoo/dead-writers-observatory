import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import {
  auditAllFixtures,
  auditFixtureRetrieval,
} from "@/lib/retrieval-audit";
import { loadBaselineSnapshot } from "@/lib/retrieval-regression";
import { buildFixtureSnapshot } from "@/lib/retrieval-snapshot";

export default async function CuratorRetrievalPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  const { fixture } = await searchParams;
  const audits = fixture
    ? [await auditFixtureRetrieval(fixture)].filter(
        (item): item is NonNullable<typeof item> => Boolean(item),
      )
    : await auditAllFixtures();
  const baseline = loadBaselineSnapshot();

  const currentByFixture = new Map(
    await Promise.all(
      audits.map(async (audit) => {
        const snap = await buildFixtureSnapshot(audit.fixtureId, audit.question);
        return [audit.fixtureId, snap] as const;
      }),
    ),
  );

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">RETRIEVAL AUDIT</p>
        <h2>Why this evidence?</h2>
        <p className="panel__lede">
          Deterministic retriever の selected / rejected を人間が確認する。
          Similarity alone ≠ Retrieval Quality。
          Relevance × Provenance × Review Integrity × Source Diversity ×
          Authorial Distance。
        </p>
        <ul className="fixture-tabs">
          <li>
            <Link href="/curator/retrieval">ALL</Link>
          </li>
          {FIXTURE_QUESTIONS.map((item) => (
            <li key={item.id}>
              <Link href={`/curator/retrieval?fixture=${item.id}`}>
                {item.id}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {audits.map((audit) => {
        const current = currentByFixture.get(audit.fixtureId);
        const baseFixture = baseline?.fixtures.find(
          (item) => item.fixtureId === audit.fixtureId,
        );

        return (
          <section key={audit.fixtureId} className="panel">
            <p className="eyebrow">{audit.fixtureId.toUpperCase()}</p>
            <h3>{audit.question}</h3>

            {baseFixture && current ? (
              <div className="baseline-compare">
                <p className="eyebrow">BASELINE vs CURRENT</p>
                {people.map((person) => {
                  const baseWriter = baseFixture.writers.find(
                    (w) => w.personId === person.id,
                  );
                  const currentWriter = current.writers.find(
                    (w) => w.personId === person.id,
                  );
                  if (!baseWriter || !currentWriter) return null;
                  const diversityDrop =
                    currentWriter.sourceDiversity < baseWriter.sourceDiversity;
                  return (
                    <article
                      key={person.id}
                      className="baseline-compare__person"
                    >
                      <h4>{person.name}</h4>
                      <p>
                        BASELINE:{" "}
                        {baseWriter.selectedSourceIds.join(" / ") || "—"}
                      </p>
                      <p>
                        CURRENT:{" "}
                        {currentWriter.selectedSourceIds.join(" / ") || "—"}
                      </p>
                      {diversityDrop ? (
                        <p className="baseline-compare__warn">
                          WARNING Source diversity decreased:{" "}
                          {baseWriter.sourceDiversity} →{" "}
                          {currentWriter.sourceDiversity}
                        </p>
                      ) : (
                        <p>
                          Source diversity: {currentWriter.sourceDiversity} ·
                          distance diversity:{" "}
                          {currentWriter.diversity.distanceDiversity}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="panel__lede">
                Baseline snapshot 未作成。`npm run snapshot:retrieval` で保存。
              </p>
            )}

            <div className="retrieval-people">
              {audit.people.map((person) => (
                <article key={person.personId} className="retrieval-person">
                  <header>
                    <h4>{person.personName}</h4>
                    <p>
                      Selected {person.selectedIds.length} / Candidates{" "}
                      {person.candidates.length}
                    </p>
                  </header>

                  <p className="eyebrow">SELECTED EVIDENCE</p>
                  <ul className="retrieval-list">
                    {person.candidates
                      .filter((c) => c.selected)
                      .map((candidate) => (
                        <li key={candidate.fragmentId}>
                          <Link
                            href={`/curator/passages/${candidate.passageId}`}
                          >
                            {candidate.fragmentId}
                          </Link>
                          <span>
                            {candidate.sourceTitle} · score{" "}
                            {candidate.score.total} ·{" "}
                            {candidate.authorialDistance}
                          </span>
                          <span>
                            themes: {candidate.matchedThemes.join(", ") || "—"}
                          </span>
                        </li>
                      ))}
                  </ul>

                  <p className="eyebrow">REJECTED / EXCLUDED</p>
                  <ul className="retrieval-list retrieval-list--rejected">
                    {person.candidates
                      .filter((c) => !c.selected)
                      .slice(0, 8)
                      .map((candidate) => (
                        <li key={candidate.fragmentId}>
                          <Link
                            href={`/curator/passages/${candidate.passageId}`}
                          >
                            {candidate.fragmentId}
                          </Link>
                          <span>
                            score {candidate.score.total} ·{" "}
                            {candidate.rejectionReasons.join(" / ")}
                          </span>
                        </li>
                      ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
