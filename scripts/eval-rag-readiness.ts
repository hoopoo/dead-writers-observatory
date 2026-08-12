import {
  computeAllRagReadiness,
  computeGlobalRagReadiness,
} from "../src/lib/rag-readiness";
import { passages } from "../src/data/passages";

function main() {
  console.log("Dead Writers Observatory — RAG readiness (Archive Gate)\n");

  const people = computeAllRagReadiness();
  for (const person of people) {
    console.log(
      [
        person.personName,
        person.readyForRag ? "READY" : "NOT READY",
        `verifiedRatio=${person.verifiedRatio.toFixed(2)}`,
        `approvedRatio=${person.approvedRatio.toFixed(2)}`,
        `diversity=${person.sourceDiversity}`,
        `highRisk=${person.unresolvedHighRisk}`,
        `health=${person.archiveHealth.readiness}`,
        person.reasons.join(" | "),
      ].join(" · "),
    );
  }

  const global = computeGlobalRagReadiness();
  const placeholder = passages.filter(
    (p) => p.verificationStatus === "placeholder",
  ).length;

  console.log("\n=== GLOBAL ===");
  console.log(global.status);
  console.log(`Placeholder: ${placeholder}`);
  console.log(`Unresolved reviews: ${global.unresolvedReviews}`);
  console.log(`High overclaim: ${global.highOverclaimRisk}`);
  for (const reason of global.reasons) {
    console.log(`- ${reason}`);
  }
}

main();
