import fs from "node:fs";
import path from "node:path";
import type { ClaimSnapshotBundle } from "@/types/perspective-claim";

export const CLAIMS_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "generation-snapshots",
  "claims-v1.json",
);

export function writeClaimsSnapshot(bundle: ClaimSnapshotBundle): void {
  fs.mkdirSync(path.dirname(CLAIMS_SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(CLAIMS_SNAPSHOT_PATH, JSON.stringify(bundle, null, 2));
}

export function loadClaimsSnapshot(): ClaimSnapshotBundle | null {
  if (!fs.existsSync(CLAIMS_SNAPSHOT_PATH)) return null;
  return JSON.parse(
    fs.readFileSync(CLAIMS_SNAPSHOT_PATH, "utf8"),
  ) as ClaimSnapshotBundle;
}
