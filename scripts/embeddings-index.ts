import { closeReviewDb } from "../src/lib/review/db";
import { indexPassageEmbeddings } from "../src/lib/embeddings/index-passages";
import { resolveProviderKind } from "../src/lib/embeddings/provider";

function parseProviderArg(argv: string[]): string | undefined {
  for (const arg of argv) {
    if (arg.startsWith("--provider=")) return arg.slice("--provider=".length);
  }
  const idx = argv.indexOf("--provider");
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return undefined;
}

async function main() {
  const providerArg = parseProviderArg(process.argv.slice(2));
  const kind = resolveProviderKind(providerArg);
  console.log("Dead Writers Observatory — embeddings index\n");
  console.log(`Requested provider: ${kind}`);

  const report = await indexPassageEmbeddings({
    provider: kind,
    requireNeural: kind === "openai",
  });

  console.log(`Provider: ${report.provider}${report.model ? ` / ${report.model}` : ""}`);
  console.log(`Passage count (eligible): ${report.eligible}`);
  console.log(`Text count: ${report.textCount}`);
  console.log(`Estimated / actual request count: ${report.requestCount}`);
  console.log(`Already current (skipped): ${report.alreadyCurrent}`);
  console.log(`Embedded (success): ${report.success}`);
  console.log(`Errors: ${report.errors}`);
  console.log(`Skipped unapproved: ${report.skippedUnapproved}`);
  console.log(`Skipped unverified: ${report.skippedUnverified}`);
  console.log(`Skipped no text: ${report.skippedNoText}`);
  console.log(`Skipped no fragment: ${report.skippedNoFragment}`);
  console.log(`Skipped high overclaim: ${report.skippedHighOverclaim}`);
  closeReviewDb();
  if (report.errors > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  if (
    error instanceof Error &&
    error.message.includes("NEURAL PROVIDER UNAVAILABLE")
  ) {
    console.error("\nNEURAL PROVIDER UNAVAILABLE");
  }
  process.exit(1);
});
