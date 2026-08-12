/** Env helpers safe for server actions and scripts (no next/headers). */
export function isCuratorEnabled(): boolean {
  return process.env.CURATOR_ENABLED === "true";
}
