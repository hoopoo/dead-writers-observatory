import { people } from "../src/data/people";
import { passages } from "../src/data/passages";
import { fragments } from "../src/data/fragments";
import { getSourceById } from "../src/data/sources";
import { getPassageById } from "../src/data/passages";
import { getPassageReview } from "../src/data/reviews/passages";
import { getFragmentReview } from "../src/data/reviews/fragments";
import {
  isApprovedDirectEvidence,
  isDirectAuthorEvidence,
  isWorkVoice,
} from "../src/lib/evidence";
import { detectOverclaimRisk } from "../src/lib/overclaim";
import { computeAllArchiveHealth } from "../src/lib/archive-health";

function main() {
  console.log("Dead Writers Observatory — archive review\n");

  let verified = 0;
  let approved = 0;
  let pending = 0;
  let directAuthor = 0;
  let near = 0;
  let indirect = 0;
  let highOverclaim = 0;
  let missingLocator = 0;
  let missingSourceUrl = 0;

  for (const passage of passages) {
    const person = people.find((p) => p.id === passage.personId);
    const source = getSourceById(passage.sourceId);
    const review = getPassageReview(passage.id);
    const linked = fragments.filter((f) => f.passageId === passage.id);

    if (passage.verificationStatus === "verified") verified += 1;
    if (review?.reviewStatus === "approved") approved += 1;
    if (!review || review.reviewStatus === "pending" || review.reviewStatus === "needs-review") {
      pending += 1;
    }
    if (isDirectAuthorEvidence(passage, review)) directAuthor += 1;

    const locatorEmpty =
      !passage.locator.chapter &&
      !passage.locator.section &&
      !passage.locator.page &&
      !passage.locator.anchor;
    if (locatorEmpty) missingLocator += 1;
    if (!passage.verification?.sourceUrl && !source?.sourceUrl) missingSourceUrl += 1;

    for (const fragment of linked) {
      if (fragment.authorialDistance === "near") near += 1;
      if (fragment.authorialDistance === "indirect") indirect += 1;
      const fragReview = getFragmentReview(fragment.id);
      const auto = detectOverclaimRisk(fragment, passage);
      const risk = fragReview?.overclaimRisk ?? auto.risk;
      if (risk === "high") highOverclaim += 1;

      console.log(
        [
          person?.name ?? passage.personId,
          source?.title ?? passage.sourceId,
          passage.id,
          `verification=${passage.verificationStatus}`,
          `review=${review?.reviewStatus ?? "none"}`,
          `voice=${passage.voiceType}`,
          `distance=${fragment.authorialDistance}`,
          `locator=${passage.locator.anchor ?? passage.locator.section ?? "-"}`,
          `fragment=${fragment.id}`,
          `support=${fragReview?.meaningSupportedByPassage ?? "n/a"}`,
          `overclaim=${risk}`,
          isApprovedDirectEvidence(passage, review)
            ? isWorkVoice(passage)
              ? "EVIDENCE=WORK_VOICE"
              : "EVIDENCE=DIRECT_AUTHOR"
            : "EVIDENCE=REFERENCE",
        ].join(" | "),
      );
    }

    if (linked.length === 0) {
      console.log(
        [
          person?.name ?? passage.personId,
          source?.title ?? passage.sourceId,
          passage.id,
          `verification=${passage.verificationStatus}`,
          `review=${review?.reviewStatus ?? "none"}`,
          `voice=${passage.voiceType}`,
          "fragment=(none)",
        ].join(" | "),
      );
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Verified passages: ${verified}`);
  console.log(`Approved passages: ${approved}`);
  console.log(`Pending review: ${pending}`);
  console.log(`Direct author evidence: ${directAuthor}`);
  console.log(`Near evidence (fragments): ${near}`);
  console.log(`Indirect work evidence (fragments): ${indirect}`);
  console.log(`High overclaim risk: ${highOverclaim}`);
  console.log(`Missing locator: ${missingLocator}`);
  console.log(`Missing source URL: ${missingSourceUrl}`);

  console.log("\n=== ARCHIVE HEALTH ===");
  for (const health of computeAllArchiveHealth()) {
    console.log(
      `${health.personName}: readiness=${health.readiness} verified=${health.verifiedPassages} approved=${health.approvedPassages} direct=${health.directEvidenceCount} near=${health.nearEvidenceCount} indirect=${health.indirectEvidenceCount} diversity=${health.sourceDiversity} unresolved=${health.unresolvedReviews} highRisk=${health.highRiskInterpretations}`,
    );
  }

  // Fail hard conditions for curator workflow integrity.
  for (const passage of passages) {
    const review = getPassageReview(passage.id);
    if (
      passage.verificationStatus !== "verified" &&
      review?.reviewStatus === "approved" &&
      Boolean(passage.text)
    ) {
      // approved without verified is suspicious if used as DIRECT; helper blocks it.
    }
  }

  const illegal = passages.some((passage) => {
    const review = getPassageReview(passage.id);
    return (
      passage.verificationStatus !== "verified" &&
      isApprovedDirectEvidence(passage, review)
    );
  });
  if (illegal) {
    console.error("FAIL: non-verified passage treated as approved direct evidence");
    process.exit(1);
  }

  // Ensure work voice never counts as direct author evidence.
  for (const passage of passages) {
    if (isWorkVoice(passage) && isDirectAuthorEvidence(passage)) {
      console.error(`FAIL: work voice marked direct author: ${passage.id}`);
      process.exit(1);
    }
  }

  // Touch getPassageById to keep import used for tree-shaking clarity.
  void getPassageById(passages[0]?.id ?? "");
}

main();
