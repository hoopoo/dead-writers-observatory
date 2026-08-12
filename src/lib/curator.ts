/**
 * Future internal-only gate.
 * Auth is not implemented; keep a single flag for route/layout checks.
 */
export const CURATOR_MODE = true;

export function assertCuratorAccess(): void {
  if (!CURATOR_MODE) {
    throw new Error("Curator Console is disabled.");
  }
}
