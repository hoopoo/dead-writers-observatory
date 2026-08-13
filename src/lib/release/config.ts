import type { PublicPerspectiveMode } from "@/types/public";
import { isStagingModeOverrideEnabled } from "@/lib/public/mode";

export interface ReleaseConfigValidation {
  ok: boolean;
  mode: PublicPerspectiveMode;
  issues: string[];
}

const RESEARCH_FLAGS = [
  "EXPERIMENT_C",
  "STAGING_CLAIMS",
  "EVIDENCE_BOUNDED_SKELETON",
  "PUBLIC_BETA_PROSE",
] as const;

function envTrue(env: NodeJS.ProcessEnv, key: string): boolean {
  return (env[key] ?? "false").toLowerCase() === "true";
}

function resolveMode(env: NodeJS.ProcessEnv): PublicPerspectiveMode {
  const raw = (env.PUBLIC_PERSPECTIVE_MODE ?? "").toLowerCase();
  if (raw === "prose" || raw === "skeleton") return raw;
  if (envTrue(env, "PUBLIC_BETA_PROSE")) return "prose";
  return "skeleton";
}

/**
 * Public production source of truth: PUBLIC_PERSPECTIVE_MODE.
 * Legacy PUBLIC_BETA_PROSE is deprecated compatibility only.
 */
export function validateReleaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): ReleaseConfigValidation {
  const issues: string[] = [];
  const isProduction =
    env.NODE_ENV === "production" || env.PUBLIC_RELEASE === "true";

  const raw = (env.PUBLIC_PERSPECTIVE_MODE ?? "").toLowerCase();
  if (raw && raw !== "skeleton" && raw !== "prose") {
    issues.push(`invalid PUBLIC_PERSPECTIVE_MODE=${raw}`);
  }

  const mode = resolveMode(env);
  const stagingOverride =
    envTrue(env, "STAGING_MODE_OVERRIDE") || envTrue(env, "STAGING_PROSE");

  if (isProduction && stagingOverride) {
    issues.push("production must not enable STAGING_MODE_OVERRIDE / STAGING_PROSE");
  }

  if (isProduction) {
    for (const flag of RESEARCH_FLAGS) {
      if (envTrue(env, flag)) {
        issues.push(`production must not enable ${flag}`);
      }
    }
  }

  if (
    isProduction &&
    envTrue(env, "CURATOR_ENABLED") &&
    !env.CURATOR_TOKEN
  ) {
    issues.push("CURATOR_ENABLED requires CURATOR_TOKEN in production");
  } else if (envTrue(env, "CURATOR_ENABLED") && !env.CURATOR_TOKEN) {
    issues.push(
      "CURATOR_ENABLED without CURATOR_TOKEN (token gate recommended for deploy)",
    );
  }

  return {
    ok: issues.filter((i) => !i.includes("recommended")).length === 0,
    mode,
    issues,
  };
}

export function describeLegacyFlags(): string[] {
  return [
    "PUBLIC_PERSPECTIVE_MODE is the only public default source of truth.",
    "PUBLIC_BETA_PROSE is deprecated; if true, maps to prose when PUBLIC_PERSPECTIVE_MODE is unset.",
    "STAGING_PROSE / ?prose=1 remain research UI only and require STAGING_MODE_OVERRIDE.",
    "STAGING_MODE_OVERRIDE=true is required for ?mode=skeleton|prose and research observe surfaces.",
    "Production public queries cannot change mode without staging override.",
  ];
}

export { isStagingModeOverrideEnabled };
