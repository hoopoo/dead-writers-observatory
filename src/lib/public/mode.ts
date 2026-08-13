import type { PublicPerspectiveMode } from "@/types/public";

export function isStagingModeOverrideEnabled(): boolean {
  return (
    (process.env.STAGING_MODE_OVERRIDE ?? "false").toLowerCase() === "true" ||
    (process.env.STAGING_PROSE ?? "false").toLowerCase() === "true"
  );
}

/**
 * Production: ENV only.
 * Staging: `?mode=skeleton|prose` when override is enabled.
 * Default before independent blind QA: skeleton.
 */
export function getPublicPerspectiveMode(
  searchMode?: string,
): PublicPerspectiveMode {
  if (
    isStagingModeOverrideEnabled() &&
    (searchMode === "skeleton" || searchMode === "prose")
  ) {
    return searchMode;
  }

  const env = (process.env.PUBLIC_PERSPECTIVE_MODE ?? "").toLowerCase();
  if (env === "prose" || env === "skeleton") return env;

  if ((process.env.PUBLIC_BETA_PROSE ?? "false").toLowerCase() === "true") {
    return "prose";
  }

  return "skeleton";
}

export function isPublicProseMode(searchMode?: string): boolean {
  return getPublicPerspectiveMode(searchMode) === "prose";
}
