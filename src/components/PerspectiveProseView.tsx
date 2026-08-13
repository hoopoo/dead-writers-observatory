import type { EvidenceBoundedProseOutput } from "@/types/prose";
import type { EvidenceBoundedPerspectiveSkeleton } from "@/types/perspective-claim";

const SECTION_LABEL: Record<string, string> = {
  archive: "資料から見えること",
  "across-sources": "資料をまたいで見えること",
  connection: "いまの問いとの接点",
  "returned-question": "あなたに残る問い",
};

export function PerspectiveProseCard(props: {
  personName: string;
  prose: EvidenceBoundedProseOutput;
  skeleton?: EvidenceBoundedPerspectiveSkeleton;
  showProvenance?: boolean;
}) {
  const { personName, prose, skeleton, showProvenance } = props;

  return (
    <article className="perspective-skeleton perspective-prose">
      <p className="eyebrow">{personName}の資料から</p>
      <h3>{personName}</h3>
      <p className="meta-label">Literary Perspective · Meaning-preserving prose</p>

      {prose.sections.map((section) => (
        <div key={section.type}>
          <p className="eyebrow">{SECTION_LABEL[section.type] ?? section.type}</p>
          {section.sentences.map((sentence) => (
            <p key={sentence.id}>{sentence.text}</p>
          ))}
        </div>
      ))}

      {showProvenance && skeleton ? (
        <details className="prose-provenance">
          <summary>WHY THIS PERSPECTIVE?</summary>
          <p className="meta-label">Approved claims → evidence</p>
          <ul>
            {skeleton.claims.map((claim) => (
              <li key={claim.id}>
                <strong>{claim.claimType}</strong>: {claim.text}
                <br />
                <span className="meta-label">
                  evidence: {claim.evidenceIds.join(", ") || "—"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
