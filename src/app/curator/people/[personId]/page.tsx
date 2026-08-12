import Link from "next/link";
import { notFound } from "next/navigation";
import { people } from "@/data/people";
import { computeArchiveHealth } from "@/lib/archive-health";
import { computeRagReadiness } from "@/lib/rag-readiness";
import { buildPersonArchiveTree } from "@/lib/curator-overview";
import { ArchivalDistanceMeter } from "@/components/curator/ArchivalDistanceMeter";

export default async function CuratorPersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = people.find((p) => p.id === personId);
  if (!person) notFound();

  const health = computeArchiveHealth(personId);
  const rag = computeRagReadiness(personId);
  const tree = buildPersonArchiveTree(personId);

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">PERSON ARCHIVE</p>
        <h2>{person.name}</h2>
        <p className="panel__lede">
          Readiness {health.readiness.toUpperCase()} · RAG{" "}
          {rag.readyForRag ? "READY" : "NOT READY"}
        </p>
        <dl className="stat-grid">
          <div>
            <dt>VERIFIED</dt>
            <dd>{health.verifiedPassages}</dd>
          </div>
          <div>
            <dt>APPROVED</dt>
            <dd>{health.approvedPassages}</dd>
          </div>
          <div>
            <dt>DIRECT</dt>
            <dd>{health.directEvidenceCount}</dd>
          </div>
          <div>
            <dt>NEAR</dt>
            <dd>{health.nearEvidenceCount}</dd>
          </div>
          <div>
            <dt>INDIRECT</dt>
            <dd>{health.indirectEvidenceCount}</dd>
          </div>
          <div>
            <dt>SOURCES</dt>
            <dd>{health.sourceDiversity}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <p className="eyebrow">ARCHIVE TREE</p>
        <div className="archive-tree">
          {tree.map((source) => (
            <article key={source.sourceId} className="archive-tree__source">
              <header>
                <h3>
                  <Link href={`/curator/sources/${source.sourceId}`}>
                    {source.title}
                  </Link>
                </h3>
                <p>
                  {source.sourceType} · verified {source.verifiedCount} ·
                  approved {source.approvedCount} · placeholder{" "}
                  {source.placeholderCount} · fragments {source.fragmentCount} ·
                  risk {source.riskCount}
                </p>
                <p>
                  voice:{" "}
                  {Object.entries(source.voiceDistribution)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" / ") || "—"}
                </p>
                <p>
                  distance:{" "}
                  {Object.entries(source.distanceDistribution)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" / ") || "—"}
                </p>
              </header>
              <ul className="archive-tree__passages">
                {source.passages.map((passage) => (
                  <li key={passage.passageId}>
                    <div>
                      <Link href={`/curator/passages/${passage.passageId}`}>
                        {passage.passageId}
                      </Link>
                      <p>
                        {passage.verificationStatus.toUpperCase()} ·{" "}
                        {passage.reviewStatus.toUpperCase()} ·{" "}
                        {passage.isDirectAuthor
                          ? "DIRECT"
                          : passage.isWorkVoice
                            ? "WORK VOICE"
                            : passage.authorialDistance.toUpperCase()}
                      </p>
                    </div>
                    <ArchivalDistanceMeter distance={passage.authorialDistance} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
