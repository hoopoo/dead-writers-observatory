import { isCuratorEnabled } from "@/lib/curator-env";

/** @deprecated Prefer isCuratorEnabled(); kept for layout clarity. */
export const CURATOR_MODE = process.env.CURATOR_ENABLED === "true";

export { isCuratorEnabled };

export function assertCuratorAccess(): void {
  if (!isCuratorEnabled()) {
    throw new Error("CURATOR_ACCESS_DENIED");
  }
}
