import Link from "next/link";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import {
  auditAllFixtures,
  auditFixtureRetrieval,
} from "@/lib/retrieval-audit";

export default async function CuratorRetrievalPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  const { fixture } = await searchParams;
  const audits = fixture
    ? [await auditFixtureRetrieval(fixture)].filter(Boolean)
    : await auditAllFixtures();

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">RETRIEVAL AUDIT</p>
        <h2>Why this evidence?</h2>
        <p className="panel__lede">
          Deterministic retriever の selected / rejected を人間が確認する。
          RAG 導入前の評価基盤。
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
        if (!audit) return null;
        return (
          <section key={audit.fixtureId} className="panel">
            <p className="eyebrow">{audit.fixtureId.toUpperCase()}</p>
            <h3>{audit.question}</h3>
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
                          <span>
                            Theme +{candidate.score.themeRelevance} · Lens +
                            {candidate.score.lensRelevance} · Distance +
                            {candidate.score.authorialDistance} · Conf +
                            {candidate.score.confidence} · Evidence +
                            {candidate.score.evidenceBonus} · Div{" "}
                            {candidate.score.diversityAdjustment}
                          </span>
                        </li>
                      ))}
                  </ul>

                  <p className="eyebrow">REJECTED EVIDENCE</p>
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
