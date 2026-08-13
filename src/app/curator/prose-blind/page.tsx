import Link from "next/link";
import { people } from "@/data/people";
import { FIXTURE_QUESTIONS } from "@/data/fixtures/questions";
import { PRIORITY_CLAIM_FIXTURES } from "@/lib/claims/approved";
import { generateProse } from "@/lib/prose/generate";
import { DeterministicProseEditor } from "@/lib/prose/provider";
import {
  blindAssignmentFor,
  latestBlindEvaluation,
} from "@/lib/prose/blind";
import { buildExperimentBSkeletons } from "@/lib/claims/experiment-b-skeletons";
import { lookupFrozenCase } from "@/lib/release/freeze";
import { decideBlindGate } from "@/lib/release/decision";
import { ProseBlindForm } from "@/components/curator/ProseBlindForm";

function surfaceFor(
  mode: "skeleton" | "prose",
  skeletonTexts: string[],
  proseTexts: string[],
) {
  return mode === "prose" ? proseTexts : skeletonTexts;
}

export default async function ProseBlindPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string; person?: string }>;
}) {
  const params = await searchParams;
  const fixtureId = params.fixture ?? "q4";
  const personId = params.person ?? "person-soseki";
  const fixture =
    FIXTURE_QUESTIONS.find((f) => f.id === fixtureId) ?? FIXTURE_QUESTIONS[0];
  const person = people.find((p) => p.id === personId) ?? people[0];

  const frozen = lookupFrozenCase({
    question: fixture.question,
    personId: person.id,
    fixtureId: fixture.id,
  });
  const skeletons = frozen
    ? [frozen.skeleton]
    : await buildExperimentBSkeletons(fixture.question);
  const skeleton =
    frozen?.skeleton ??
    skeletons.find((s) => s.personId === person.id) ??
    skeletons[0];
  const proseTextsFromFreeze = frozen?.prose?.sections.flatMap((s) =>
    s.sentences.map((x) => x.text),
  );
  const prose =
    proseTextsFromFreeze ??
    (
      await generateProse({
        question: fixture.question,
        personId: person.id,
        fixtureId: fixture.id,
        provider:
          process.env.PROSE_LLM_PROVIDER === "deterministic"
            ? new DeterministicProseEditor()
            : undefined,
        allowRepair: true,
      })
    ).userFacing.sections.flatMap((s) => s.sentences.map((x) => x.text));

  const assignment = blindAssignmentFor(fixture.id, person.id);
  const existing = latestBlindEvaluation({
    fixtureId: fixture.id,
    personId: person.id,
  });
  const progress = decideBlindGate();

  const skeletonTexts = [
    ...skeleton.sections.archiveObservation,
    ...skeleton.sections.acrossSources,
    ...skeleton.sections.connectionToQuestion,
    ...skeleton.sections.returnedQuestion,
  ];
  const proseTexts = prose;

  const setA = surfaceFor(assignment.a, skeletonTexts, proseTexts);
  const setB = surfaceFor(assignment.b, skeletonTexts, proseTexts);

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">INDEPENDENT PROSE BLIND CHECK</p>
        <h2>
          {fixture.label} · {person.name}
        </h2>
        <p className="panel__lede">
          Origin is hidden until the verdict is saved. Do not infer writer voice.
        </p>
        <dl className="stat-grid">
          <div>
            <dt>REVIEWED</dt>
            <dd>
              {progress.reviewed} / 18
            </dd>
          </div>
          <div>
            <dt>MATERIAL MEANING</dt>
            <dd>{progress.materialMeaning}</dd>
          </div>
          <div>
            <dt>ATTRIBUTION UNSAFE</dt>
            <dd>{progress.attributionUnsafe}</dd>
          </div>
          <div>
            <dt>PROSE READABILITY BETTER</dt>
            <dd>{progress.readabilityBetter}</dd>
          </div>
          <div>
            <dt>PROSE USEFULNESS BETTER</dt>
            <dd>{progress.usefulnessBetter}</dd>
          </div>
          <div>
            <dt>GATE</dt>
            <dd>{progress.decision}</dd>
          </div>
        </dl>
        <div className="curator-filters">
          {PRIORITY_CLAIM_FIXTURES.map((id) => (
            <Link
              key={id}
              href={`/curator/prose-blind?fixture=${id}&person=${person.id}`}
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
              href={`/curator/prose-blind?fixture=${fixture.id}&person=${p.id}`}
              className={
                p.id === person.id ? "button-secondary" : "button-ghost"
              }
            >
              {p.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">SET A</p>
        {setA.map((text, index) => (
          <p key={`a-${index}`}>{text}</p>
        ))}
      </section>

      <section className="panel">
        <p className="eyebrow">SET B</p>
        {setB.map((text, index) => (
          <p key={`b-${index}`}>{text}</p>
        ))}
      </section>

      <ProseBlindForm
        fixtureId={fixture.id}
        personId={person.id}
        existing={existing}
      />
    </div>
  );
}
