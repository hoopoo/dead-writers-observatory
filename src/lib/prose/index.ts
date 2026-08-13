export { buildExperimentBProseInput, hashProseInput } from "@/lib/prose/input";
export {
  createProseLLMProvider,
  DeterministicProseEditor,
  OpenAIProseLLMProvider,
  getProsePromptVersion,
} from "@/lib/prose/provider";
export {
  validateProseOutput,
  filterAllowedProse,
  assertProseInputApprovedOnly,
} from "@/lib/prose/validator";
export { generateProse, repairProseOnce } from "@/lib/prose/generate";
export {
  ensureProseTables,
  findCachedProse,
  saveProseRecord,
  getProseById,
  listProseRecords,
  saveProseHumanEvaluation,
  listProseHumanEvaluations,
} from "@/lib/prose/store";
export { analyzeCrossWriterProseDistinctiveness } from "@/lib/prose/distinctiveness";
export { PROSE_SYSTEM_PROMPT, buildProseUserPrompt } from "@/lib/prose/prompt";

export function isStagingProseEnabled(searchFlag?: string): boolean {
  if (searchFlag === "1" || searchFlag === "true") return true;
  if ((process.env.PUBLIC_BETA_PROSE ?? "false").toLowerCase() === "true") {
    return true;
  }
  return (process.env.STAGING_PROSE ?? "false").toLowerCase() === "true";
}

export function isPublicBetaProseEnabled(): boolean {
  return (process.env.PUBLIC_BETA_PROSE ?? "false").toLowerCase() === "true";
}
