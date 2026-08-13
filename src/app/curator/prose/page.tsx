import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "@/lib/claims/approved";
import { generateProse } from "@/lib/prose/generate";
import { analyzeCrossWriterProseDistinctiveness } from "@/lib/prose/distinctiveness";
import { listProseHumanEvaluations } from "@/lib/prose/store";
import { DeterministicProseEditor } from "@/lib/prose/provider";
import { ProseHumanReviewForm } from "@/components/curator/ProseHumanReviewForm";

export default async function CuratorProsePage({
  searchParams,
}: {
  searchParams: Promise<{
    fixture?: string;
    person?: string;
    set?: string;
    generate?: string;
  }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const personId = params.person ?? "person-soseki";
  const blindSet = params.set === "B" ? "B" : "A";
  const fixture =
    FIXTURE_QUESTIONS.find((f) => f.id === fixtureId) ?? FIXTURE_QUESTIONS[0];
  const person = people.find((p) => p.id === personId) ?? people[0];

  const preferDet =
    process.env.PROSE_LLM_PROVIDER === "deterministic" ||
    params.generate === "deterministic";
  const provider = preferDet ? new DeterministicProseEditor() : undefined;

  const peerResults = await Promise.all(
    people.map(async (p) =>
      generateProse({
        question: fixture.question,
        personId: p.id,
        fixtureId: fixture.id,
        provider,
        allowRepair: true,
      }),
    ),
  );

  const result =
    peerResults.find((r) => r.input.personId === person.id) ?? peerResults[0];

  const cross = analyzeCrossWriterProseDistinctiveness({
    fixtureId: fixture.id,
    skeletons: peerResults.map((r) => r.input.skeleton),
    proseByPerson: Object.fromEntries(
      peerResults.map((r) => [r.input.personId, r.record.output]),
    ),
  });

  const human = listProseHumanEvaluations({
    proseId: result.record.id,
  })[0];

  const claimMap = new Map(
    result.input.approvedClaims.map((c) => [c.id, c] as const),
  );
  const provenanceByClaim = new Map(
    result.input.provenance.map((p) => [p.claimId, p] as const),
  );

  const showSkeletonFirst = blindSet === "A";

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">EVIDENCE-BOUNDED PROSE · EXPERIMENT B ONLY</p>
        <h2>Meaning-Preserving Editor</h2>
        <p className="panel__lede">
          Do not create meaning. Preserve it while making it readable.
        </p>
        <div className="curator-filters">
          {PRIORITY_CLAIM_FIXTURES.map((id) => (
            <Link
              key={id}
              href={`/curator/prose?fixture=${id}&person=${person.id}&set=${blindSet}`}
              className={id === fixture.id ? "button-secondary" : "button-ghost"}
            >
              {id}
            </Link>
          ))}
        </div>
        <div className="curator-filters">
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/curator/prose?fixture=${fixture.id}&person=${p.id}&set=${blindSet}`}
              className={
                p.id === person.id ? "button-secondary" : "button-ghost"
              }
            >
              {p.name}
            </Link>
          ))}
        </div>
        <div className="curator-filters">
          <Link
            href={`/curator/prose?fixture=${fixture.id}&person=${person.id}&set=A`}
            className={blindSet === "A" ? "button-secondary" : "button-ghost"}
          >
            SET A
          </Link>
          <Link
            href={`/curator/prose?fixture=${fixture.id}&person=${person.id}&set=B`}
            className={blindSet === "B" ? "button-secondary" : "button-ghost"}
          >
            SET B
          </Link>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">CROSS-WRITER PROSE DISTINCTIVENESS</p>
        <dl className="stat-grid">
          <div>
            <dt>SKELETON</dt>
            <dd>{cross.skeletonDistinctiveness}</dd>
          </div>
          <div>
            <dt>PROSE</dt>
            <dd>{cross.proseDistinctiveness}</dd>
          </div>
          <div>
            <dt>DELTA</dt>
            <dd>{cross.delta}</dd>
          </div>
          <div>
            <dt>RQ OVERLAP</dt>
            <dd>{cross.returnedQuestionOverlap}</dd>
          </div>
          <div>
            <dt>CONVERGENCE</dt>
            <dd>{cross.convergenceRisk}</dd>
          </div>
        </dl>
        {cross.issues.length > 0 ? (
          <ul className="warning-list">
            {cross.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p className="meta-label">No high-convergence flags</p>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">
          {showSkeletonFirst ? "SET A (blind)" : "SET B (blind)"}
        </p>
        <h3>Perspective surface</h3>
        {showSkeletonFirst ? (
          <>
            {result.input.skeleton.sections.archiveObservation.map((t) => (
              <p key={t}>{t}</p>
            ))}
            {result.input.skeleton.sections.acrossSources.map((t) => (
              <p key={t}>{t}</p>
            ))}
            {result.input.skeleton.sections.connectionToQuestion.map((t) => (
              <p key={t}>{t}</p>
            ))}
            {result.input.skeleton.sections.returnedQuestion.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </>
        ) : (
          result.userFacing.sections.map((section) => (
            <div key={section.type}>
              <p className="eyebrow">{section.type}</p>
              {section.sentences.map((s) => (
                <p key={s.id}>{s.text}</p>
              ))}
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">APPROVED CLAIMS</p>
        <ul>
          {result.input.approvedClaims.map((claim) => (
            <li key={claim.id}>
              <strong>{claim.claimType}</strong> · {claim.authorialAttribution} ·{" "}
              {claim.historicalTransfer}
              <br />
              {claim.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <p className="eyebrow">PROSE + SENTENCE ↔ CLAIM TRACE</p>
        <p className="meta-label">
          provider {result.record.provider} / {result.record.model} /{" "}
          {result.record.promptVersion}
          {result.repaired ? " · repaired" : ""}
        </p>
        {result.record.output.sections.map((section) => (
          <div key={section.type}>
            <h3>{section.type}</h3>
            {section.sentences.map((sentence) => {
              const validation = result.record.validation.sentenceResults.find(
                (r) => r.sentenceId === sentence.id,
              );
              const blocked = Boolean(validation && !validation.allowed);
              return (
                <details
                  key={sentence.id}
                  className={blocked ? "prose-sentence-blocked" : undefined}
                >
                  <summary>
                    {blocked ? "BLOCKED SENTENCE · " : ""}
                    {sentence.text}
                  </summary>
                  <p>
                    <strong>SUPPORTED BY</strong>
                  </p>
                  <ul>
                    {sentence.claimIds.map((id) => {
                      const claim = claimMap.get(id);
                      const prov = provenanceByClaim.get(id);
                      return (
                        <li key={id}>
                          Claim {id}: {claim?.text ?? "(missing)"}
                          <br />
                          Evidence: {prov?.evidenceIds.join(", ") || "—"}
                          <br />
                          Sources: {prov?.sourceIds.join(", ") || "—"}
                        </li>
                      );
                    })}
                  </ul>
                  <p>
                    Transformation: {sentence.transformationType}
                    <br />
                    Support: {validation?.support ?? "—"}
                    <br />
                    Issues: {validation?.issues.join(", ") || "none"}
                  </p>
                  {blocked ? (
                    <p className="warn">
                      Reason:{" "}
                      {(validation?.issues[0] ?? "unsupported").toUpperCase()}
                    </p>
                  ) : null}
                </details>
              );
            })}
          </div>
        ))}
      </section>

      <section className="panel">
        <p className="eyebrow">VALIDATION</p>
        <dl className="stat-grid">
          <div>
            <dt>SENTENCES</dt>
            <dd>{result.record.validation.totalSentences}</dd>
          </div>
          <div>
            <dt>SUPPORTED</dt>
            <dd>{result.record.validation.supportedSentences}</dd>
          </div>
          <div>
            <dt>UNSUPPORTED</dt>
            <dd>{result.record.validation.unsupportedSentences}</dd>
          </div>
          <div>
            <dt>COVERAGE</dt>
            <dd>{result.record.validation.claimCoverageRate}</dd>
          </div>
          <div>
            <dt>PRESERVATION</dt>
            <dd>{result.record.validation.semanticPreservationRate}</dd>
          </div>
          <div>
            <dt>ALLOWED</dt>
            <dd>{result.record.validation.allowed ? "yes" : "no"}</dd>
          </div>
        </dl>
      </section>

      <ProseHumanReviewForm
        proseId={result.record.id}
        fixtureId={fixture.id}
        personId={person.id}
        existing={human}
      />
    </div>
  );
}
