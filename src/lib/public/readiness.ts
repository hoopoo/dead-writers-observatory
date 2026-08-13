import { listIndependentProseBlindEvaluations, summarizeBlindGate } from "@/lib/prose/blind";
import type { PublicBetaReadiness } from "@/types/public";

export function getPublicBetaReadiness(): PublicBetaReadiness {
  const gate = summarizeBlindGate(listIndependentProseBlindEvaluations());
  let independentBlindCheck: PublicBetaReadiness["independentBlindCheck"] =
    "PENDING";
  if (gate.reviewed > 0) {
    independentBlindCheck = gate.gatePass ? "PASS" : "FAIL";
  }

  return {
    archive: "READY",
    retrieval: "READY",
    claims: "READY",
    distinctiveness: "READY",
    prose: "P1 READY",
    independentBlindCheck,
    publicUx: "READY",
    releaseQa: "PENDING",
  };
}
