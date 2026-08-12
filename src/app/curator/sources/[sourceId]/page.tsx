import Link from "next/link";
import { notFound } from "next/navigation";
import { getSourceById } from "@/data/sources";
import { getPassagesBySourceId } from "@/data/passages";
import { getActivePassageReview } from "@/lib/review/active";
import { people } from "@/data/people";

export default async function CuratorSourcePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const source = getSourceById(sourceId);
  if (!source) notFound();
  const person = people.find((p) => p.id === source.personId);
  const sourcePassages = getPassagesBySourceId(sourceId);

  return (
    <div className="curator-page">
      <section className="panel">
        <p className="eyebrow">SOURCE</p>
        <h2>{source.title}</h2>
        <p className="panel__lede">
          {person?.name} · {source.sourceType} ·{" "}
          {source.publicationDate ?? "year unknown"}
        </p>
        <p>{source.bibliographicReference}</p>
        {source.sourceUrl ? (
          <p>
            <a href={source.sourceUrl} target="_blank" rel="noreferrer">
              {source.sourceUrl}
            </a>
          </p>
        ) : null}
        <p>
          <Link href={`/curator/people/${source.personId}`}>← Person archive</Link>
        </p>
      </section>

      <section className="panel">
        <p className="eyebrow">PASSAGES</p>
        <ul className="pending-list">
          {sourcePassages.map((passage) => {
            const review = getActivePassageReview(passage.id);
            return (
              <li key={passage.id}>
                <div>
                  <strong>{passage.id}</strong>
                  <p>
                    {passage.verificationStatus} ·{" "}
                    {review?.reviewStatus ?? "pending"} · {passage.voiceType}
                  </p>
                </div>
                <Link
                  className="button-secondary"
                  href={`/curator/passages/${passage.id}`}
                >
                  REVIEW
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
