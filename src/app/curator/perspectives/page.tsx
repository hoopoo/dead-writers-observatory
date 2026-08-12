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
import {
  buildExperimentClaimPool,
  comparePerspectiveExperiments,
  deathEvidenceSaturation,
} from "@/lib/claims/experiment-c/build";
import { getPassageById } from "@/data/passages";

export default async function PerspectivesPage({
  searchParams,
}: {
  searchParams: Promise<{
    fixture?: string;
    experiment?: string;
    compare?: string;
  }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const experiment =
    params.experiment === "A" || params.experiment === "C"
      ? params.experiment
      : "B";
  const compare = params.compare === "bc";
  const fixture =
    FIXTURE_QUESTIONS.find((f) => f.id === fixtureId) ?? FIXTURE_QUESTIONS[0];

  if (compare) {
    const rows = await Promise.all(
      people.map(async (person) => {
        const b = await buildExperimentClaimPool({
          experimentId: "B",
          question: fixture.question,
          personId: person.id,
          fixtureId: fixture.id,
        });
        const c = await buildExperimentClaimPool({
          experimentId: "C",
          question: fixture.question,
          personId: person.id,
          fixtureId: fixture.id,
        });
        const comparison = comparePerspectiveExperiments({
          fixtureId: fixture.id,
          personId: person.id,
          b,
          c,
        });
        return { person, b, c, comparison };
      }),
    );

    const claimsByB = Object.fromEntries(
      rows.map((r) => [r.person.id, r.b.skeleton.claims]),
    );
    const claimsByC = Object.fromEntries(
      rows.map((r) => [r.person.id, r.c.skeleton.claims]),
    );
    const crossB = analyzeCrossWriterDistinctiveness({
      question: fixture.question,
      claimsByPerson: claimsByB,
    });
    const crossC = analyzeCrossWriterDistinctiveness({
      question: fixture.question,
      claimsByPerson: claimsByC,
    });

    return (
      <main className="curator-main">
        <section className="panel">
          <p className="eyebrow">B vs C</p>
          <h2>Change the retrieval. Keep the perspective intact.</h2>
          <p className="lede">
            Neural-hybrid retrievalによって、この作家のArchiveから見える視点は
            実際に良くなったか。それとも、Experiment Bの方が十分に明確だったか。
          </p>
          <p className="meta">
            Distinctiveness B={crossB.distinctivenessScore} C=
            {crossC.distinctivenessScore} · Convergence B=
            {crossB.convergenceRisk} C={crossC.convergenceRisk} · RQ overlap B=
            {crossB.returnedQuestionOverlap} C={crossC.returnedQuestionOverlap}
          </p>
        </section>

        <section className="panel row-gap">
          <div className="chip-row">
            {PRIORITY_CLAIM_FIXTURES.map((id) => {
              const item = FIXTURE_QUESTIONS.find((f) => f.id === id)!;
              return (
                <Link
                  key={id}
                  href={`/curator/perspectives?fixture=${id}&compare=bc`}
                  className={id === fixture.id ? "chip chip--active" : "chip"}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <Link href={`/curator/perspectives?fixture=${fixture.id}&experiment=B`}>
            Exit B vs C
          </Link>
        </section>

        {rows.map(({ person, b, c, comparison }) => (
          <section key={person.id} className="panel">
            <h3>{person.name}</h3>
            <p className="meta">
              Evidence changed: {comparison.retrievalEvidenceChanged ? "yes" : "no"}
              {deathEvidenceSaturation(c.pool.packet, fixture.id)
                ? " · DEATH-EVIDENCE SATURATION"
                : ""}
            </p>
            <div className="compare-grid">
              <div>
                <p className="eyebrow">EXPERIMENT B</p>
                <p className="meta">
                  sources={comparison.experimentB.sourceIds.length} claims=
                  {comparison.experimentB.claimIds.length}
                </p>
                {b.skeleton.claims.map((claim) => (
                  <article key={claim.id} className="claim-card">
                    <p className="meta">
                      {claim.generatorOrigin === "llm" ? "LLM" : "DET"} ·{" "}
                      {claim.claimType}
                    </p>
                    <p>{claim.text}</p>
                  </article>
                ))}
                <p className="eyebrow">Returned</p>
                {b.skeleton.sections.returnedQuestion.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
              <div>
                <p className="eyebrow">EXPERIMENT C</p>
                <p className="meta">
                  sources={comparison.experimentC.sourceIds.length} claims=
                  {comparison.experimentC.claimIds.length}
                </p>
                {c.skeleton.claims.map((claim) => (
                  <article key={claim.id} className="claim-card">
                    <p className="meta">
                      {claim.generatorOrigin === "llm" ? "LLM" : "DET"} ·{" "}
                      {claim.claimType}
                    </p>
                    <p>{claim.text}</p>
                  </article>
                ))}
                <p className="eyebrow">Returned</p>
                {c.skeleton.sections.returnedQuestion.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </div>
            <p className="eyebrow">EVIDENCE CHANGES</p>
            <p className="meta">
              Added in C: {comparison.addedSources.join(", ") || "—"}
            </p>
            <p className="meta">
              Removed from B: {comparison.removedSources.join(", ") || "—"}
            </p>
            <p className="meta">
              Unchanged: {comparison.unchangedSources.join(", ") || "—"}
            </p>
            <p className="eyebrow">CLAIM CHANGES</p>
            <p className="meta">
              New in C: {comparison.addedClaims.length} · Lost from B:{" "}
              {comparison.removedClaims.length} · Equivalent:{" "}
              {comparison.equivalentClaims.length}
            </p>
            {comparison.addedSources.length > 0 ? (
              <details>
                <summary>NEURAL RETRIEVAL ADDED → NEW PACKET TRACE</summary>
                <ul>
                  {c.pool.packet.evidence.slice(0, 4).map((e) => {
                    const passage = getPassageById(e.passageId);
                    return (
                      <li key={e.id}>
                        {e.sourceTitle} · {passage?.text?.slice(0, 120)}
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
          </section>
        ))}
      </main>
    );
  }

  const columns = await Promise.all(
    people.map(async (person) => {
      if (experiment === "C") {
        const built = await buildExperimentClaimPool({
          experimentId: "C",
          question: fixture.question,
          personId: person.id,
          fixtureId: fixture.id,
        });
        const diversity = analyzeWriterDiversity(
          person.id,
          built.skeleton.claims,
        );
        const fingerprint = buildWriterFingerprint(
          person.id,
          built.skeleton.claims,
        );
        return {
          person,
          skeleton: built.skeleton,
          diversity,
          fingerprint,
          llmCount: built.pool.llmHumanApprovedClaims.length,
        };
      }

      const det = await generateClaimsForQuestion({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        retrievalMode: "deterministic",
      });
      const llm = listProposedClaims({
        fixtureId: fixture.id,
        personId: person.id,
        experimentId: "B",
        retrievalMode: "deterministic",
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
            : experiment === "C"
              ? "neural-hybrid retrieval + approved LLM claims"
              : "deterministic retrieval + human-approved LLM claims"}
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
          {(["A", "B", "C"] as const).map((id) => (
            <Link
              key={id}
              href={`/curator/perspectives?fixture=${fixture.id}&experiment=${id}`}
              className={experiment === id ? "chip chip--active" : "chip"}
            >
              Experiment {id}
            </Link>
          ))}
          <Link
            href={`/curator/perspectives?fixture=${fixture.id}&compare=bc`}
            className="chip"
          >
            B vs C
          </Link>
          <Link
            href={`/observe?q=${encodeURIComponent(fixture.question)}&${
              experiment === "C" ? "experiment=C" : "stagingClaims=1"
            }`}
            className="chip"
          >
            Open observe
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
          {cross.returnedQuestionOverlap}
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
