import Link from "next/link";
import { notFound } from "next/navigation";
import { fragments } from "@/data/fragments";
import { getPassageById } from "@/data/passages";
import { getSourceById } from "@/data/sources";
import { people } from "@/data/people";
import { getPassageReview } from "@/data/reviews/passages";
import { getFragmentReview } from "@/data/reviews/fragments";
import { detectOverclaimRisk } from "@/lib/overclaim";
import {
  buildInterpretationLadder,
  estimateInterpretationDistance,
} from "@/lib/interpretation-ladder";
import { analyzeQuestion } from "@/lib/question-analysis";
import {
  matchedThemesFor,
  scoreFragmentBreakdown,
} from "@/lib/retrieval";
import { ArchivalDistanceMeter } from "@/components/curator/ArchivalDistanceMeter";
import { InterpretationLadder } from "@/components/curator/InterpretationLadder";
import { ReviewActionBar } from "@/components/curator/ReviewActionBar";
import { SourceInterpretationDiff } from "@/components/curator/SourceInterpretationDiff";
import { VoiceWarnings } from "@/components/curator/VoiceWarnings";

const CHECK_LABELS: Record<string, string> = {
  textVerified: "Text verified",
  locatorVerified: "Locator verified",
  voiceVerified: "Voice verified",
  authorialDistanceVerified: "Authorial distance verified",
  sourceRelationshipVerified: "Source relationship verified",
  fragmentMeaningVerified: "Fragment meaning verified",
};

export default async function CuratorPassagePage({
  params,
}: {
  params: Promise<{ passageId: string }>;
}) {
  const { passageId } = await params;
  const passage = getPassageById(passageId);
  if (!passage) notFound();

  const person = people.find((p) => p.id === passage.personId);
  const source = getSourceById(passage.sourceId);
  const review = getPassageReview(passage.id);
  const linked = fragments.filter((f) => f.passageId === passage.id);
  const primary = linked[0];
  const fragmentReview = primary
    ? getFragmentReview(primary.id)
    : undefined;
  const distance = primary?.authorialDistance ?? "unknown";
  const ladder = buildInterpretationLadder({
    passage,
    fragment: primary,
    modernTransfer: "現代の問いへの接続は、観測側の仮説として分離する。",
    aiInference:
      "利用者への当てはめは AI inference。作者の発言ではない。",
  });
  const interpDistance = primary
    ? estimateInterpretationDistance(primary, passage)
    : undefined;

  const sampleQuestion =
    "AIに仕事を奪われるのが怖い。会社を辞めて独立したい。でも収入がなくなるのが怖い。";
  const analysis = analyzeQuestion(sampleQuestion);
  const score = primary
    ? scoreFragmentBreakdown(primary, analysis, passage.personId)
    : undefined;
  const matched = primary ? matchedThemesFor(primary, analysis) : [];

  const unchecked = review
    ? Object.entries(review.checks)
        .filter(([, value]) => !value)
        .map(([key]) => CHECK_LABELS[key] ?? key)
    : Object.values(CHECK_LABELS);

  return (
    <div className="curator-page">
      <VoiceWarnings passage={passage} distance={distance} />

      <section className="panel">
        <p className="eyebrow">SOURCE PASSAGE</p>
        <h2>{passage.id}</h2>
        <dl className="meta-list">
          <div>
            <dt>Person</dt>
            <dd>
              <Link href={`/curator/people/${passage.personId}`}>
                {person?.name ?? passage.personId}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>
              <Link href={`/curator/sources/${passage.sourceId}`}>
                {source?.title ?? passage.sourceId}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Source type</dt>
            <dd>{source?.sourceType ?? "—"}</dd>
          </div>
          <div>
            <dt>Locator</dt>
            <dd>
              {[
                passage.locator.chapter,
                passage.locator.section,
                passage.locator.anchor,
              ]
                .filter(Boolean)
                .join(" / ") || "—"}
            </dd>
          </div>
          <div>
            <dt>Verification</dt>
            <dd>{passage.verificationStatus.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>{(review?.reviewStatus ?? "pending").toUpperCase()}</dd>
          </div>
          <div>
            <dt>Voice</dt>
            <dd>{passage.voiceType.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Speaker</dt>
            <dd>{passage.speaker ?? "Author"}</dd>
          </div>
          <div>
            <dt>Authorial Distance</dt>
            <dd>{distance.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Author Direct Statement</dt>
            <dd>{passage.isAuthorDirectStatement ? "YES" : "NO"}</dd>
          </div>
          <div>
            <dt>Provenance Confidence</dt>
            <dd>{passage.provenanceConfidence.toUpperCase()}</dd>
          </div>
        </dl>
        <ArchivalDistanceMeter distance={distance} />
      </section>

      <section className="panel">
        <p className="eyebrow">SOURCE TEXT</p>
        {passage.verificationStatus === "verified" && passage.text ? (
          <p className="source-text">{passage.text}</p>
        ) : (
          <p className="diff-panel__empty">NO VERIFIED TEXT</p>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">SOURCE METADATA</p>
        <dl className="meta-list">
          <div>
            <dt>Source URL</dt>
            <dd>
              {passage.verification?.sourceUrl ?? source?.sourceUrl ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Bibliographic Reference</dt>
            <dd>{source?.bibliographicReference ?? "—"}</dd>
          </div>
          <div>
            <dt>Edition / Year</dt>
            <dd>{source?.publicationDate ?? "—"}</dd>
          </div>
          <div>
            <dt>Copyright / Public Domain</dt>
            <dd>
              {source?.copyrightStatus ?? "—"} /{" "}
              {source?.publicDomainStatus ?? "—"}
            </dd>
          </div>
          <div>
            <dt>Checked Against</dt>
            <dd>{passage.verification?.checkedAgainst ?? "—"}</dd>
          </div>
          <div>
            <dt>Checked At</dt>
            <dd>{passage.verification?.checkedAt ?? "—"}</dd>
          </div>
          <div>
            <dt>Verification Notes</dt>
            <dd>
              {passage.verification?.notes ?? passage.notes ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <SourceInterpretationDiff
        sourceText={
          passage.verificationStatus === "verified" ? passage.text : undefined
        }
        fragment={primary}
        fragmentReview={fragmentReview}
        distance={distance}
      />

      <section className="panel">
        <p className="eyebrow">INTERPRETATION LADDER</p>
        <InterpretationLadder steps={ladder} />
        {interpDistance ? (
          <dl className="diff-meta" style={{ marginTop: "1rem" }}>
            <div>
              <dt>source → fragment</dt>
              <dd>{interpDistance.sourceToFragment.toUpperCase()}</dd>
            </div>
            <div>
              <dt>fragment → perspective</dt>
              <dd>{interpDistance.fragmentToPerspective.toUpperCase()}</dd>
            </div>
            <div>
              <dt>perspective → modern transfer</dt>
              <dd>
                {interpDistance.perspectiveToModernTransfer.toUpperCase()}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="panel">
        <p className="eyebrow">FRAGMENT REVIEW</p>
        {linked.length === 0 ? (
          <p>No linked ThoughtFragment.</p>
        ) : (
          <ul className="fragment-review-list">
            {linked.map((fragment) => {
              const fr = getFragmentReview(fragment.id);
              const auto = detectOverclaimRisk(fragment, passage);
              return (
                <li key={fragment.id}>
                  <strong>{fragment.id}</strong>
                  <p>{fragment.normalizedMeaning}</p>
                  <p>
                    themes: {fragment.themes.join(", ")} · type:{" "}
                    {fragment.interpretationType} · distance:{" "}
                    {fragment.authorialDistance} · confidence:{" "}
                    {fragment.confidence}
                  </p>
                  {fragment.historicalContext ? (
                    <p>context: {fragment.historicalContext}</p>
                  ) : null}
                  {fragment.interpretiveNotes ? (
                    <p>notes: {fragment.interpretiveNotes}</p>
                  ) : null}
                  <p>
                    SUPPORT:{" "}
                    {(fr?.meaningSupportedByPassage ?? "unclear").toUpperCase()}{" "}
                    · OVERCLAIM: {(fr?.overclaimRisk ?? auto.risk).toUpperCase()}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">CURATOR CHECKS</p>
        <ul className="check-list">
          {Object.entries(CHECK_LABELS).map(([key, label]) => {
            const ok = Boolean(
              review?.checks[key as keyof typeof review.checks],
            );
            return (
              <li key={key} className={ok ? "check-ok" : "check-missing"}>
                {ok ? "✓" : "○"} {label}
              </li>
            );
          })}
        </ul>
        {unchecked.length > 0 ? (
          <p className="panel__lede">
            未確認: {unchecked.join(" · ")}
          </p>
        ) : (
          <p className="panel__lede">全チェック確認済み。</p>
        )}
      </section>

      <ReviewActionBar passageId={passage.id} initialReview={review} />

      {score ? (
        <section className="panel">
          <p className="eyebrow">WHY THIS EVIDENCE?</p>
          <p className="panel__lede">
            Sample query trace（deterministic retrieval preview）
          </p>
          <p>MATCHED THEMES: {matched.join(", ") || "—"}</p>
          <ul className="score-list">
            <li>Theme relevance +{score.themeRelevance}</li>
            <li>Lens relevance +{score.lensRelevance}</li>
            <li>Authorial distance +{score.authorialDistance}</li>
            <li>Confidence +{score.confidence}</li>
            <li>Evidence bonus +{score.evidenceBonus}</li>
            <li>Diversity adjustment {score.diversityAdjustment}</li>
            <li>
              <strong>TOTAL {score.total}</strong>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );
}
