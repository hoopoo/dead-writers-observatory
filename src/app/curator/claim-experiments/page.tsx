import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { ClaimHumanReviewForm } from "@/components/curator/ClaimHumanReviewForm";
import { PRIORITY_CLAIM_FIXTURES } from "@/lib/claims/approved";
import { getClaimHumanEvaluation } from "@/lib/claims/human-eval";
import { isLlmStagingEligible, isTrueLlmAddedValue } from "@/lib/claims/staging";
import { runLlmClaimExperimentCase } from "@/lib/claims/llm/experiment";
import { OpenAIClaimLLMProvider } from "@/lib/claims/llm/provider";
import { getPassageById } from "@/data/passages";

type LiveFilter =
  | "unreviewed"
  | "new-angle-candidates"
  | "high-usefulness"
  | "surprising"
  | "possible-rephrase"
  | "possible-stereotype"
  | "human-approved"
  | "human-rejected"
  | "all";

export default async function ClaimExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fixture?: string;
    person?: string;
    blind?: string;
    queue?: string;
  }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const personId = params.person ?? "person-soseki";
  const blind = params.blind === "1";
  const queue = (params.queue as LiveFilter) || "unreviewed";

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

  const llmItems = experiment?.llmClaims ?? [];
  const withEval = llmItems.map((item) => ({
    item,
    evaluation: getClaimHumanEvaluation({ claimId: item.claim.id }),
  }));

  const filtered = withEval.filter(({ item, evaluation }) => {
    const staging = isLlmStagingEligible(item.claim, evaluation);
    switch (queue) {
      case "unreviewed":
        return !evaluation?.noveltyVerdict;
      case "new-angle-candidates":
        return (
          item.novelty?.novelty === "new-angle" ||
          evaluation?.usefulnessVerdict === "surprising-but-defensible"
        );
      case "high-usefulness":
        return (
          evaluation?.usefulnessVerdict === "useful" ||
          evaluation?.usefulnessVerdict === "surprising-but-defensible"
        );
      case "surprising":
        return evaluation?.usefulnessVerdict === "surprising-but-defensible";
      case "possible-rephrase":
        return (
          item.novelty?.novelty === "similar" ||
          item.novelty?.novelty === "duplicate" ||
          evaluation?.noveltyVerdict === "useful-rephrase"
        );
      case "possible-stereotype":
        return (
          evaluation?.noveltyVerdict === "stereotype" ||
          item.claim.validationIssues.includes("writer-stereotype-injection") ||
          /自滅|発狂|個人主義だけ/.test(item.claim.text)
        );
      case "human-approved":
        return staging.ok;
      case "human-rejected":
        return Boolean(evaluation?.noveltyVerdict) && !staging.ok;
      default:
        return true;
    }
  });

  const trueValue = withEval.filter(({ item, evaluation }) =>
    isTrueLlmAddedValue(item.claim, evaluation),
  ).length;
  const noveltyCounts = {
    newAngle: withEval.filter((r) => r.evaluation?.noveltyVerdict === "new-angle")
      .length,
    rephrase: withEval.filter(
      (r) => r.evaluation?.noveltyVerdict === "useful-rephrase",
    ).length,
    duplicate: withEval.filter(
      (r) => r.evaluation?.noveltyVerdict === "duplicate",
    ).length,
    stereotype: withEval.filter(
      (r) => r.evaluation?.noveltyVerdict === "stereotype",
    ).length,
    unclear: withEval.filter((r) => r.evaluation?.noveltyVerdict === "unclear")
      .length,
    reviewed: withEval.filter((r) => r.evaluation?.noveltyVerdict).length,
  };

  const queues: Array<{ id: LiveFilter; label: string }> = [
    { id: "unreviewed", label: "UNREVIEWED" },
    { id: "new-angle-candidates", label: "NEW-ANGLE CANDIDATES" },
    { id: "high-usefulness", label: "HIGH USEFULNESS" },
    { id: "surprising", label: "SURPRISING" },
    { id: "possible-rephrase", label: "POSSIBLE REPHRASE" },
    { id: "possible-stereotype", label: "POSSIBLE STEREOTYPE" },
    { id: "human-approved", label: "HUMAN APPROVED" },
    { id: "human-rejected", label: "HUMAN REJECTED" },
    { id: "all", label: "ALL" },
  ];

  return (
    <main className="curator-main">
      <section className="panel">
        <p className="eyebrow">LLM LIVE REVIEW</p>
        <h2>The model may propose. The archive does not have to agree.</h2>
        <p className="lede">
          AIは答えを作るのではなく、資料の間にある接続候補を提案します。
          <br />
          Human novelty が staging 採用を決めます（lexical new-angle は参考）。
        </p>
        <p className="meta">
          Reviewed novelty: {noveltyCounts.reviewed}/{llmItems.length} · True LLM
          Added Value: {trueValue} · New-angle: {noveltyCounts.newAngle} ·
          Rephrase: {noveltyCounts.rephrase} · Duplicate:{" "}
          {noveltyCounts.duplicate} · Stereotype: {noveltyCounts.stereotype}
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
                href={`/curator/claim-experiments?fixture=${id}&person=${person.id}&queue=${queue}${blind ? "&blind=1" : ""}`}
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
              href={`/curator/claim-experiments?fixture=${fixture.id}&person=${item.id}&queue=${queue}${blind ? "&blind=1" : ""}`}
              className={item.id === person.id ? "chip chip--active" : "chip"}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="chip-row">
          {queues.map((item) => (
            <Link
              key={item.id}
              href={`/curator/claim-experiments?fixture=${fixture.id}&person=${person.id}&queue=${item.id}${blind ? "&blind=1" : ""}`}
              className={queue === item.id ? "chip chip--active" : "chip"}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>
          {fixture.label} / {person.name}
        </h3>
        <p>{fixture.question}</p>
      </section>

      <section className="panel">
        <h3>REVIEW QUEUE · {queue}</h3>
        {filtered.map(({ item, evaluation }) => {
          const evidence = experiment?.packet.evidence.filter((e) =>
            item.claim.evidenceIds.includes(e.id),
          );
          const staging = isLlmStagingEligible(item.claim, evaluation);
          return (
            <article key={item.claim.id} className="claim-card">
              <p className="meta">
                {blind ? "SET ITEM" : "LLM PROPOSAL"} · {item.claim.claimType}
                {!blind ? " · HUMAN APPROVED candidate gate" : ""}
                {staging.ok ? " · STAGING ELIGIBLE" : ` · blocked:${staging.reason}`}
              </p>
              <p>{item.claim.text}</p>
              <p className="meta">
                MACHINE SUPPORT: {item.claim.supportStatus} · Attribution:{" "}
                {item.claim.authorialAttribution} · Distance:{" "}
                {item.claim.interpretationDistance} · Transfer:{" "}
                {item.claim.historicalTransfer}
              </p>
              <p className="meta">
                HUMAN: evidence={evaluation?.evidenceVerdict ?? "—"} usefulness=
                {evaluation?.usefulnessVerdict ?? "—"} strength=
                {evaluation?.strengthVerdict ?? "—"} novelty=
                {evaluation?.noveltyVerdict ?? "unreviewed"}
              </p>
              <details>
                <summary>WHY THIS CLAIM?</summary>
                <ul>
                  {(evidence ?? []).map((e) => {
                    const passage = getPassageById(e.passageId);
                    return (
                      <li key={e.id}>
                        <strong>{e.sourceTitle}</strong> · voice={e.voiceType} ·
                        distance={e.authorialDistance}
                        <br />
                        {passage?.text?.slice(0, 160) ?? e.normalizedMeaning}
                      </li>
                    );
                  })}
                </ul>
              </details>
              <ClaimHumanReviewForm
                claimId={item.claim.id}
                fixtureId={fixture.id}
                personId={person.id}
                existing={evaluation}
                requireNovelty
              />
            </article>
          );
        })}
        {filtered.length === 0 ? <p className="meta">No items in queue.</p> : null}
      </section>

      <section className="panel">
        <h3>DETERMINISTIC BASELINE (reference)</h3>
        {(experiment?.deterministicClaims ?? []).map((claim) => (
          <article key={claim.id} className="claim-card">
            <p className="meta">DETERMINISTIC · {claim.claimType}</p>
            <p>{claim.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
