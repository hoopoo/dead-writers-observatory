import Link from "next/link";
import { analyzeQuestion } from "@/lib/question-analysis";
import {
  formatPublicQueryResolutionTrace,
  resolvePublicQuery,
} from "@/lib/public/query-resolver";
import { observePublicBeta } from "@/lib/public/observe";

export default async function CuratorQueryResolutionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const question = params.q?.trim() ?? "";
  const analysis = question ? analyzeQuestion(question) : null;
  const resolution = analysis
    ? resolvePublicQuery(question, analysis)
    : null;
  const observation = question
    ? await observePublicBeta(question, "skeleton")
    : null;

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">PUBLIC QUERY RESOLUTION</p>
        <h2>v0.1.1 hotfix trace</h2>
        <p className="panel__lede">
          Routing only. Does not invent claims. Safety notice is independent of family match.
        </p>
        <form method="get" action="/curator/query-resolution">
          <label htmlFor="q">Question</label>
          <textarea id="q" name="q" rows={3} defaultValue={question} />
          <button type="submit" className="button-secondary">
            Resolve
          </button>
        </form>
      </section>

      {resolution && observation ? (
        <section className="panel">
          <pre>{formatPublicQueryResolutionTrace(question, resolution)}</pre>
          <p>Safety notice: {observation.observation.safetyNotice ? "yes" : "no"}</p>
          <ul>
            {observation.writers.map((writer) => (
              <li key={writer.personId}>
                {writer.personName}: {writer.availability}
              </li>
            ))}
          </ul>
          <p>
            Comparison all-insufficient:{" "}
            {observation.summary.allInsufficient ? "yes" : "no"}
          </p>
          <Link className="button-secondary" href={`/observe?q=${encodeURIComponent(question)}`}>
            Open public observe
          </Link>
        </section>
      ) : null}
    </div>
  );
}
