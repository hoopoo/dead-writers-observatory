import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { ClaimHumanReviewForm } from "@/components/curator/ClaimHumanReviewForm";
import { PRIORITY_CLAIM_FIXTURES } from "@/lib/claims/approved";
import { getClaimHumanEvaluation } from "@/lib/claims/human-eval";
import { machineHumanDisagreement } from "@/lib/claims/human-summary";
import { runLlmClaimExperimentCase } from "@/lib/claims/llm/experiment";
import { OpenAIClaimLLMProvider } from "@/lib/claims/llm/provider";

function flip(seed: string): boolean {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 1;
}

export default async function ClaimExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fixture?: string;
    person?: string;
    blind?: string;
  }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const personId = params.person ?? "person-soseki";
  const blind = params.blind === "1";

  const fixture =
    FIXTURE_QUESTIONS.find((item) => item.id === fixtureId) ??
    FIXTURE_QUESTIONS[0];
  const person = people.find((p) => p.id === personId) ?? people[0];
  const providerOk = OpenAIClaimLLMProvider.isConfigured();

  const experiment = providerOk
    ? await runLlmClaimExperimentCase({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
      })
    : null;

  const flipped = flip(`${fixture.id}:${person.id}:llm-claims`);
  const setA = flipped
    ? experiment?.llmClaims.map((c) => c.claim) ?? []
    : experiment?.deterministicClaims ?? [];
  const setB = flipped
    ? experiment?.deterministicClaims ?? []
    : experiment?.llmClaims.map((c) => c.claim) ?? [];
  const setATitle = blind ? "SET A" : flipped ? "LLM PROPOSALS" : "DETERMINISTIC";
  const setBTitle = blind ? "SET B" : flipped ? "DETERMINISTIC" : "LLM PROPOSALS";

  const queryBase = `/curator/claim-experiments?fixture=${fixture.id}&person=${person.id}`;

  return (
    <main className="curator-main">
      <section className="panel">
        <p className="eyebrow">LLM CLAIM EXPERIMENT</p>
        <h2>The model may propose. The archive does not have to agree.</h2>
        <p className="lede">
          AIは答えを作るのではなく、資料の間にある接続候補を提案します。
          <br />
          残すかどうかは、Evidenceと人間のレビューが決めます。
        </p>
        <p className="meta">
          Prompt {experiment?.record?.promptVersion ?? "v1"} · Provider{" "}
          {experiment?.record?.provider ?? (providerOk ? "openai" : "unavailable")} ·
          Model {experiment?.record?.model ?? "—"}
        </p>
        {!providerOk || experiment?.providerUnavailable ? (
          <p className="warn">LLM CLAIM PROVIDER UNAVAILABLE</p>
        ) : null}
      </section>

      <section className="panel row-gap">
        <div className="chip-row">
          {PRIORITY_CLAIM_FIXTURES.map((id) => {
            const item = FIXTURE_QUESTIONS.find((f) => f.id === id)!;
            return (
              <Link
                key={id}
                href={`/curator/claim-experiments?fixture=${id}&person=${person.id}${blind ? "&blind=1" : ""}`}
                className={id === fixture.id ? "chip chip--active" : "chip"}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="chip-row">
          {people.map((item) => (
            <Link
              key={item.id}
              href={`/curator/claim-experiments?fixture=${fixture.id}&person=${item.id}${blind ? "&blind=1" : ""}`}
              className={item.id === person.id ? "chip chip--active" : "chip"}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <Link href={`${queryBase}&blind=${blind ? "0" : "1"}`}>
          {blind ? "Exit blind mode" : "Blind evaluation mode"}
        </Link>
      </section>

      <section className="panel">
        <h3>{fixture.label}</h3>
        <p>{fixture.question}</p>
        <p className="meta">
          Evidence packet: {experiment?.packet.evidence.length ?? 0} items · hash{" "}
          {experiment?.packetHash ?? "—"}
        </p>
      </section>

      <section className="compare-grid">
        <div className="panel">
          <h3>{setATitle}</h3>
          {(setA.length ? setA : []).map((claim) => (
            <article key={claim.id} className="claim-card">
              <p className="meta">
                {claim.claimType}
                {!blind ? ` · ${claim.generatorOrigin ?? "deterministic"}` : ""}
              </p>
              <p>{claim.text}</p>
              <p className="meta">
                Support: {claim.supportStatus} · Allowed:{" "}
                {claim.allowedInFinalPerspective ? "yes" : "no"}
              </p>
            </article>
          ))}
          {setA.length === 0 ? <p className="meta">No claims.</p> : null}
        </div>
        <div className="panel">
          <h3>{setBTitle}</h3>
          {(setB.length ? setB : []).map((claim) => (
            <article key={claim.id} className="claim-card">
              <p className="meta">
                {claim.claimType}
                {!blind ? ` · ${claim.generatorOrigin ?? "deterministic"}` : ""}
              </p>
              <p>{claim.text}</p>
              <p className="meta">
                Support: {claim.supportStatus} · Allowed:{" "}
                {claim.allowedInFinalPerspective ? "yes" : "no"}
              </p>
            </article>
          ))}
          {setB.length === 0 ? <p className="meta">No claims.</p> : null}
        </div>
      </section>

      <section className="panel">
        <h3>LLM HUMAN REVIEW QUEUE</h3>
        <p className="meta">
          Origin is stored with the claim. Blind mode hides labels above; review
          forms still bind to claim ids.
        </p>
        {(experiment?.llmClaims ?? [])
          .filter((item) => item.claim.allowedInFinalPerspective)
          .slice(0, 5)
          .map((item) => {
            const existing = getClaimHumanEvaluation({ claimId: item.claim.id });
            const disagreement = existing
              ? machineHumanDisagreement({
                  claim: item.claim,
                  evaluation: existing,
                })
              : null;
            return (
              <article key={item.claim.id} className="claim-card">
                <p className="meta">
                  {item.claim.claimType} · novelty={item.novelty?.novelty ?? "—"}
                  {!blind ? " · origin=llm" : ""}
                </p>
                <p>{item.claim.text}</p>
                <p className="meta">Rationale: {item.proposal.rationale}</p>
                <p className="meta">
                  MACHINE Support: {item.claim.supportStatus} · Issues:{" "}
                  {item.claim.validationIssues.join(", ") || "none"}
                </p>
                {disagreement ? (
                  <p className="warn">MACHINE / HUMAN DISAGREEMENT — {disagreement}</p>
                ) : null}
                <ClaimHumanReviewForm
                  claimId={item.claim.id}
                  fixtureId={fixture.id}
                  personId={person.id}
                  existing={existing}
                />
              </article>
            );
          })}
      </section>

      <section className="panel">
        <h3>BLOCKED LLM PROPOSALS (observation)</h3>
        {(experiment?.llmClaims ?? [])
          .filter((item) => !item.claim.allowedInFinalPerspective)
          .map((item) => (
            <article key={item.claim.id} className="claim-card">
              <p className="meta">{item.claim.claimType}</p>
              <p>{item.claim.text}</p>
              <p className="meta">
                Issues: {item.claim.validationIssues.join(", ") || "blocked"}
                {item.schemaIssues.length
                  ? ` · schema: ${item.schemaIssues.join(", ")}`
                  : ""}
              </p>
            </article>
          ))}
      </section>
    </main>
  );
}
