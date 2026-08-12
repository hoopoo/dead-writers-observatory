import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { generateClaimsForQuestion } from "@/lib/claims";

type Filter =
  | "all"
  | "supported"
  | "partial"
  | "blocked"
  | "authorial-risk"
  | "historical-risk";

export default async function CuratorClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fixture?: string;
    person?: string;
    filter?: string;
  }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const personId = params.person ?? "person-soseki";
  const filter = (params.filter as Filter) ?? "all";

  const fixture =
    FIXTURE_QUESTIONS.find((item) => item.id === fixtureId) ??
    FIXTURE_QUESTIONS[0];
  const person = people.find((p) => p.id === personId) ?? people[0];

  const result = await generateClaimsForQuestion({
    question: fixture.question,
    personId: person.id,
    retrievalMode: "deterministic",
  });

  const validationsById = new Map(
    result.validations.map((v) => [v.claimId, v]),
  );

  const filtered = result.claims.filter((claim) => {
    const validation = validationsById.get(claim.id);
    if (filter === "supported") return claim.supportStatus === "supported";
    if (filter === "partial") {
      return claim.supportStatus === "partially-supported";
    }
    if (filter === "blocked") return !claim.allowedInFinalPerspective;
    if (filter === "authorial-risk") {
      return validation?.attributionRisk === "high";
    }
    if (filter === "historical-risk") {
      return validation?.historicalTransferRisk === "high";
    }
    return true;
  });

  const base = `/curator/claims?fixture=${fixture.id}&person=${person.id}`;

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">CLAIM LAYER</p>
        <h2>Evidence first. Claims second. Prose later.</h2>
        <p className="panel__lede">
          Generator proposes. Evidence decides. Blocked claims stay visible for
          debug — they never enter final perspective candidates.
        </p>

        <div className="retrieval-controls">
          <div>
            <p className="eyebrow">FIXTURE</p>
            <ul className="fixture-tabs">
              {FIXTURE_QUESTIONS.map((item, index) => (
                <li key={item.id}>
                  <Link
                    href={`/curator/claims?fixture=${item.id}&person=${person.id}&filter=${filter}`}
                    className={item.id === fixture.id ? "is-active" : undefined}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">WRITER</p>
            <ul className="fixture-tabs">
              {people.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/curator/claims?fixture=${fixture.id}&person=${item.id}&filter=${filter}`}
                    className={item.id === person.id ? "is-active" : undefined}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">FILTER</p>
            <ul className="fixture-tabs">
              {(
                [
                  "all",
                  "supported",
                  "partial",
                  "blocked",
                  "authorial-risk",
                  "historical-risk",
                ] as Filter[]
              ).map((item) => (
                <li key={item}>
                  <Link
                    href={`${base}&filter=${item}`}
                    className={item === filter ? "is-active" : undefined}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="question-panel__text" style={{ fontSize: "1.35rem" }}>
          {fixture.question}
        </p>
      </section>

      <section className="panel">
        <p className="eyebrow">EVIDENCE PACKET — {person.name}</p>
        <p className="panel__lede">
          Mode {result.packet.retrievalMode} · Evidence{" "}
          {result.packet.evidence.length} · Rejected{" "}
          {result.packet.rejectedCandidates.length} · Tensions{" "}
          {result.packet.tensions.length}
        </p>
        <ol className="mode-rank-list">
          {result.packet.evidence.map((item, index) => (
            <li key={item.id}>
              <strong>
                {index + 1}. {item.sourceTitle}
              </strong>
              <span>
                {item.voiceType} · {item.authorialDistance.toUpperCase()} ·{" "}
                {item.evidenceRole} · review {item.reviewStatus}
              </span>
              <span>{item.normalizedMeaning}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <p className="eyebrow">CLAIM QUALITY</p>
        <dl className="diff-meta">
          <div>
            <dt>TOTAL</dt>
            <dd>{result.quality.totalClaims}</dd>
          </div>
          <div>
            <dt>SUPPORTED</dt>
            <dd>{result.quality.supported}</dd>
          </div>
          <div>
            <dt>PARTIAL</dt>
            <dd>{result.quality.partiallySupported}</dd>
          </div>
          <div>
            <dt>UNSUPPORTED</dt>
            <dd>{result.quality.unsupported}</dd>
          </div>
          <div>
            <dt>ALLOWED</dt>
            <dd>{result.quality.allowed}</dd>
          </div>
          <div>
            <dt>BLOCKED</dt>
            <dd>{result.quality.blocked}</dd>
          </div>
          <div>
            <dt>WORK VOICE VIOLATIONS</dt>
            <dd>{result.quality.workVoiceViolationCount}</dd>
          </div>
          <div>
            <dt>ATTR RISK</dt>
            <dd>{result.quality.attributionRiskCount}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <p className="eyebrow">GENERATED CLAIMS</p>
        <div className="claim-card-grid">
          {filtered.map((claim) => {
            const validation = validationsById.get(claim.id);
            const linked = result.packet.evidence.filter((e) =>
              claim.evidenceIds.includes(e.id),
            );
            return (
              <article
                key={claim.id}
                className={
                  claim.allowedInFinalPerspective
                    ? "claim-card"
                    : "claim-card claim-card--blocked"
                }
              >
                {!claim.allowedInFinalPerspective ? (
                  <p className="baseline-compare__warn">BLOCKED</p>
                ) : null}
                <h3>{claim.text}</h3>
                <dl className="diff-meta">
                  <div>
                    <dt>TYPE</dt>
                    <dd>{claim.claimType}</dd>
                  </div>
                  <div>
                    <dt>SUPPORT</dt>
                    <dd>{claim.supportStatus}</dd>
                  </div>
                  <div>
                    <dt>ALLOWED</dt>
                    <dd>{claim.allowedInFinalPerspective ? "YES" : "NO"}</dd>
                  </div>
                  <div>
                    <dt>ATTRIBUTION</dt>
                    <dd>{claim.authorialAttribution}</dd>
                  </div>
                  <div>
                    <dt>INTERP DIST</dt>
                    <dd>{claim.interpretationDistance}</dd>
                  </div>
                  <div>
                    <dt>HIST TRANSFER</dt>
                    <dd>{claim.historicalTransfer}</dd>
                  </div>
                  <div>
                    <dt>CONFIDENCE</dt>
                    <dd>{claim.confidence}</dd>
                  </div>
                  <div>
                    <dt>ATTR RISK</dt>
                    <dd>{validation?.attributionRisk ?? "—"}</dd>
                  </div>
                </dl>
                {claim.validationIssues.length > 0 ? (
                  <ul className="warning-list">
                    {claim.validationIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="eyebrow">EVIDENCE</p>
                <ul className="mode-rank-list">
                  {linked.map((item) => (
                    <li key={item.id}>
                      <strong>{item.sourceTitle}</strong>
                      <span>
                        {item.voiceType} · {item.authorialDistance.toUpperCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {result.packet.tensions.length > 0 ? (
        <section className="panel">
          <p className="eyebrow">EVIDENCE TENSIONS (not flattened)</p>
          <ul className="warning-list" style={{ color: "inherit" }}>
            {result.packet.tensions.map((tension) => (
              <li key={tension.description}>{tension.description}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
