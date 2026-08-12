import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import {
  PRIORITY_CLAIM_FIXTURES,
  buildPerspectiveSkeleton,
  buildStagingPerspectiveSkeleton,
} from "@/lib/claims/approved";
import { generateClaimsForQuestion } from "@/lib/claims";
import { listProposedClaims } from "@/lib/claims/llm/store";
import {
  analyzeCrossWriterDistinctiveness,
  analyzeWriterDiversity,
  buildWriterFingerprint,
} from "@/lib/claims/distinctiveness";
import { extractConcepts } from "@/lib/claims/redundancy";

export default async function PerspectivesPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; experiment?: string }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const experiment = params.experiment === "A" ? "A" : "B";
  const fixture =
    FIXTURE_QUESTIONS.find((f) => f.id === fixtureId) ?? FIXTURE_QUESTIONS[0];

  const columns = await Promise.all(
    people.map(async (person) => {
      const det = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        retrievalMode: "deterministic",
      });
      const llm = listProposedClaims({
        fixtureId: fixture.id,
        personId: person.id,
      }).map((i) => i.claim);

      const skeleton =
        experiment === "A"
          ? buildPerspectiveSkeleton({
              personId: person.id,
              question: fixture.question,
              claims: det.claims,
            })
          : buildStagingPerspectiveSkeleton({
              personId: person.id,
              question: fixture.question,
              deterministicClaims: det.claims,
              llmClaims: llm,
            });

      const diversity = analyzeWriterDiversity(person.id, skeleton.claims);
      const fingerprint = buildWriterFingerprint(person.id, skeleton.claims);
      return { person, skeleton, diversity, fingerprint, llmCount: llm.length };
    }),
  );

  const claimsByPerson = Object.fromEntries(
    columns.map((col) => [col.person.id, col.skeleton.claims]),
  );
  const cross = analyzeCrossWriterDistinctiveness({
    question: fixture.question,
    claimsByPerson,
  });

  return (
    <main className="curator-main">
      <section className="panel">
        <p className="eyebrow">PERSPECTIVE SETS</p>
        <h2>Three archives in. Three different perspectives out.</h2>
        <p className="lede">
          Experiment {experiment}:{" "}
          {experiment === "A"
            ? "deterministic claims only"
            : "deterministic + human-approved LLM claims"}
        </p>
      </section>

      <section className="panel row-gap">
        <div className="chip-row">
          {PRIORITY_CLAIM_FIXTURES.map((id) => {
            const item = FIXTURE_QUESTIONS.find((f) => f.id === id)!;
            return (
              <Link
                key={id}
                href={`/curator/perspectives?fixture=${id}&experiment=${experiment}`}
                className={id === fixture.id ? "chip chip--active" : "chip"}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="chip-row">
          <Link
            href={`/curator/perspectives?fixture=${fixture.id}&experiment=A`}
            className={experiment === "A" ? "chip chip--active" : "chip"}
          >
            Experiment A
          </Link>
          <Link
            href={`/curator/perspectives?fixture=${fixture.id}&experiment=B`}
            className={experiment === "B" ? "chip chip--active" : "chip"}
          >
            Experiment B
          </Link>
          <Link
            href={`/observe?q=${encodeURIComponent(fixture.question)}&stagingClaims=1`}
            className="chip"
          >
            Open staging observe
          </Link>
        </div>
      </section>

      <section className="compare-grid compare-grid--3">
        {columns.map(({ person, skeleton, diversity, fingerprint }) => (
          <div key={person.id} className="panel">
            <h3>{person.name}</h3>
            <p className="meta">
              availability={skeleton.availability} · diversity=
              {diversity.score} · redundancy={diversity.redundancyCount}
            </p>
            {diversity.narrowArchiveConnection ? (
              <p className="warn">NARROW ARCHIVE CONNECTION</p>
            ) : null}
            {diversity.dominantTheme ? (
              <p className="meta">
                THEME SATURATION · {diversity.dominantTheme}{" "}
                {Math.round(diversity.dominantThemeRatio * 100)}%
              </p>
            ) : null}
            <p className="eyebrow">Approved Claims</p>
            {skeleton.claims.map((claim) => (
              <article key={claim.id} className="claim-card">
                <p className="meta">
                  {(claim.generatorOrigin ?? "deterministic") === "llm"
                    ? "LLM PROPOSAL · HUMAN APPROVED"
                    : "DETERMINISTIC"}{" "}
                  · {claim.claimType}
                </p>
                <p>{claim.text}</p>
                <p className="meta">
                  concepts: {extractConcepts(claim.text).join(", ") || "—"}
                </p>
              </article>
            ))}
            <p className="eyebrow">Fingerprint themes</p>
            <p className="meta">
              {[...fingerprint.dominantThemes, ...fingerprint.secondaryThemes]
                .join(", ") || "—"}
            </p>
            <p className="eyebrow">Returned question</p>
            {skeleton.sections.returnedQuestion.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        ))}
      </section>

      <section className="panel">
        <h3>CROSS-WRITER PANEL</h3>
        <p className="meta">
          Distinctiveness: {cross.distinctivenessScore} · Convergence:{" "}
          {cross.convergenceRisk} · Returned overlap:{" "}
          {cross.returnedQuestionOverlap} · Semantic overlap:{" "}
          {cross.perspectiveSemanticOverlap}
        </p>
        <p className="eyebrow">WHERE THEY MEET</p>
        <p>{cross.sharedThemes.join(", ") || "(no shared dominant themes)"}</p>
        <p className="eyebrow">WHERE THEY DIFFER</p>
        <ul>
          {cross.writerSpecificThemes.map((row) => (
            <li key={row.personId}>
              {people.find((p) => p.id === row.personId)?.name}:{" "}
              {row.themes.join(", ") || "—"}
            </li>
          ))}
        </ul>
        <p className="eyebrow">RETURNED QUESTION DIFFERENCE</p>
        <p className="meta">
          risk={cross.returnedQuestions.risk} · repeated=
          {cross.returnedQuestions.repeatedConcepts.join(", ") || "none"}
        </p>
        {cross.warnings.map((warning) => (
          <p key={warning} className="warn">
            {warning}
          </p>
        ))}
      </section>
    </main>
  );
}
