import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { computePublicBetaReadiness } from "@/lib/release/decision";
import type { PublicBetaReadinessV01 } from "@/types/release";

export function getPublicBetaReadiness(): PublicBetaReadinessV01 {
  const qaPath = path.join(
    process.cwd(),
    "src",
    "data",
    "release",
    "release-qa-v0.1.json",
  );
  let qa: { pass: number; needsReview: number; fail: number; total: number } | undefined;
  if (existsSync(qaPath)) {
    qa = JSON.parse(readFileSync(qaPath, "utf8")) as typeof qa;
  }
  return computePublicBetaReadiness({ buildOk: true, qa });
}
