import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { ClaimHumanReviewForm } from "@/components/curator/ClaimHumanReviewForm";
import { generateClaimsForQuestion } from "@/lib/claims";
import {
  getClaimHumanEvaluation,
  listClaimHumanEvaluations,
} from "@/lib/claims/human-eval";
import {
  PRIORITY_CLAIM_FIXTURES,
  isHumanApprovedClaim,
} from "@/lib/claims/approved";
import { samplePriorityClaims } from "@/lib/claims/sampling";
import {
  machineHumanDisagreement,
  summarizeClaimHumanEvaluations,
} from "@/lib/claims/human-summary";

type Filter =
  | "all"
  | "priority"
  | "unreviewed"
  | "disagreement"
  | "partial"
  | "modern-transfer"
  | "work-level"
  | "cross-evidence-synthesis"
  | "returned-question"
  | "supported"
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
  const filter = (params.filter as Filter) ?? "priority";

  const fixture =
    FIXTURE_QUESTIONS.find((item) => item.id === fixtureId) ??
    FIXTURE_QUESTIONS[0];
  const person = people.find((p) => p.id === personId) ?? people[0];
  const isPriorityFixture = (PRIORITY_CLAIM_FIXTURES as readonly string[]).includes(
    fixture.id,
  );

  const result = await generateClaimsForQuestion({
    question: fixture.question,
    personId: person.id,
    fixtureId: fixture.id,
    retrievalMode: "deterministic",
  });

  const validationsById = new Map(
    result.validations.map((v) => [v.claimId, v]),
  );
  const allEvals = listClaimHumanEvaluations();
  const claimsById = new Map(result.claims.map((c) => [c.id, c]));
  const summary = summarizeClaimHumanEvaluations({
    evaluations: allEvals,
    claimsById: new Map(
      // summary across all evals needs claim types — attach from current page when available
      allEvals.map((evaluation) => {
        const claim = claimsById.get(evaluation.claimId);
        return [evaluation.claimId, claim ?? ({ claimType: "unknown" } as never)];
      }),
    ),
  });

  const prioritySample = samplePriorityClaims(result.claims);
  const priorityIds = new Set(prioritySample.map((c) => c.id));

  let filtered = result.claims;
  if (filter === "priority") filtered = prioritySample;
  else if (filter === "unreviewed") {
    filtered = result.claims.filter(
      (claim) => !getClaimHumanEvaluation({ claimId: claim.id }),
    );
  } else if (filter === "disagreement") {
    filtered = result.claims.filter((claim) => {
      const evaluation = getClaimHumanEvaluation({ claimId: claim.id });
      return evaluation
        ? Boolean(machineHumanDisagreement({ claim, evaluation }))
        : false;
    });
  } else if (filter === "partial") {
    filtered = result.claims.filter(
      (c) => c.supportStatus === "partially-supported",
    );
  } else if (filter === "modern-transfer") {
    filtered = result.claims.filter((c) => c.claimType === "modern-transfer");
  } else if (filter === "work-level") {
    filtered = result.claims.filter(
      (c) => c.authorialAttribution === "work-level",
    );
  } else if (filter === "cross-evidence-synthesis") {
    filtered = result.claims.filter(
      (c) => c.claimType === "cross-evidence-synthesis",
    );
  } else if (filter === "returned-question") {
    filtered = result.claims.filter((c) => c.claimType === "returned-question");
  } else if (filter === "supported") {
    filtered = result.claims.filter((c) => c.supportStatus === "supported");
  } else if (filter === "blocked") {
    filtered = result.claims.filter((c) => !c.allowedInFinalPerspective);
  } else if (filter === "authorial-risk") {
    filtered = result.claims.filter(
      (c) => validationsById.get(c.id)?.attributionRisk === "high",
    );
  } else if (filter === "historical-risk") {
    filtered = result.claims.filter(
      (c) => validationsById.get(c.id)?.historicalTransferRisk === "high",
    );
  }

  const approvedCount = result.claims.filter((claim) =>
    isHumanApprovedClaim(claim, getClaimHumanEvaluation({ claimId: claim.id })),
  ).length;

  const base = `/curator/claims?fixture=${fixture.id}&person=${person.id}`;

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">CLAIM LAYER + HUMAN REVIEW</p>
        <h2>Safe is not enough. A claim must also be useful.</h2>
        <p className="panel__lede">
          Machine metrics and human judgment stay separate. Correct but obvious
          is not enough. Interesting but unsupported is not acceptable.
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
                    {(PRIORITY_CLAIM_FIXTURES as readonly string[]).includes(
                      item.id,
                    )
                      ? "*"
                      : ""}
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
            <p className="eyebrow">CLAIM REVIEW QUEUE</p>
            <ul className="fixture-tabs">
              {(
                [
                  "priority",
                  "unreviewed",
                  "disagreement",
                  "partial",
                  "modern-transfer",
                  "work-level",
                  "cross-evidence-synthesis",
                  "returned-question",
                  "all",
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
        {isPriorityFixture ? (
          <p className="baseline-compare__warn">PRIORITY HUMAN CLAIM REVIEW</p>
        ) : null}
      </section>

      <section className="panel">
        <p className="eyebrow">HUMAN CLAIM REVIEW PROGRESS</p>
        <dl className="diff-meta">
          <div>
            <dt>REVIEWED (ALL)</dt>
            <dd>{summary.reviewed}</dd>
          </div>
          <div>
            <dt>GROUNDING</dt>
            <dd>{summary.groundingRate.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>USEFULNESS</dt>
            <dd>{summary.usefulnessRate.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>SURPRISING</dt>
            <dd>{summary.surprisingRate.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>TOO STRONG</dt>
            <dd>{summary.overstatementRate.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>MISATTRIBUTED</dt>
            <dd>{summary.misattributionRate.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>APPROVED HERE</dt>
            <dd>{approvedCount}</dd>
          </div>
          <div>
            <dt>PRIORITY SAMPLE</dt>
            <dd>{prioritySample.length}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <p className="eyebrow">EVIDENCE PACKET — {person.name}</p>
        <ol className="mode-rank-list">
          {result.packet.evidence.map((item, index) => (
            <li key={item.id}>
              <strong>
                {index + 1}. {item.sourceTitle}
              </strong>
              <span>
                {item.voiceType} · {item.authorialDistance.toUpperCase()} ·{" "}
                {item.evidenceRole}
              </span>
              <span>{item.normalizedMeaning}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel">
        <p className="eyebrow">GENERATED CLAIMS</p>
        <div className="claim-card-grid">
          {filtered.map((claim) => {
            const validation = validationsById.get(claim.id);
            const human = getClaimHumanEvaluation({ claimId: claim.id });
            const disagreement = human
              ? machineHumanDisagreement({ claim, evaluation: human })
              : null;
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
                {priorityIds.has(claim.id) ? (
                  <p className="eyebrow">PRIORITY SAMPLE</p>
                ) : null}
                {!claim.allowedInFinalPerspective ? (
                  <p className="baseline-compare__warn">BLOCKED (machine)</p>
                ) : null}
                {disagreement ? (
                  <p className="baseline-compare__warn">
                    MACHINE / HUMAN DISAGREEMENT — {disagreement}
                  </p>
                ) : null}
                <h3>{claim.text}</h3>
                <dl className="diff-meta">
                  <div>
                    <dt>MACHINE SUPPORT</dt>
                    <dd>{claim.supportStatus}</dd>
                  </div>
                  <div>
                    <dt>ATTR RISK</dt>
                    <dd>{validation?.attributionRisk ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>TYPE</dt>
                    <dd>{claim.claimType}</dd>
                  </div>
                  <div>
                    <dt>ATTRIBUTION</dt>
                    <dd>{claim.authorialAttribution}</dd>
                  </div>
                  <div>
                    <dt>HUMAN EVIDENCE</dt>
                    <dd>{human?.evidenceVerdict ?? "NOT REVIEWED"}</dd>
                  </div>
                  <div>
                    <dt>HUMAN USEFULNESS</dt>
                    <dd>{human?.usefulnessVerdict ?? "NOT REVIEWED"}</dd>
                  </div>
                  <div>
                    <dt>HUMAN STRENGTH</dt>
                    <dd>{human?.strengthVerdict ?? "NOT REVIEWED"}</dd>
                  </div>
                  <div>
                    <dt>APPROVED?</dt>
                    <dd>
                      {isHumanApprovedClaim(claim, human) ? "YES" : "NO"}
                    </dd>
                  </div>
                </dl>
                <details>
                  <summary className="eyebrow">WHY THIS CLAIM?</summary>
                  <ul className="mode-rank-list">
                    {linked.map((item) => (
                      <li key={item.id}>
                        <strong>{item.sourceTitle}</strong>
                        <span>
                          {item.voiceType} ·{" "}
                          {item.authorialDistance.toUpperCase()} · support{" "}
                          {item.supportStatus}
                        </span>
                        {item.passageText ? (
                          <p className="evidence-preview">{item.passageText}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </details>
                <ClaimHumanReviewForm
                  claimId={claim.id}
                  fixtureId={fixture.id}
                  personId={person.id}
                  existing={human}
                />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
