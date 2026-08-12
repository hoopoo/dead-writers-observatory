import type { AuthorialDistance } from "@/types/thought-fragment";

const POSITIONS: Record<AuthorialDistance, number> = {
  direct: 0,
  near: 40,
  indirect: 100,
  unknown: 70,
};

export function ArchivalDistanceMeter({
  distance,
}: {
  distance: AuthorialDistance;
}) {
  const left = POSITIONS[distance];
  return (
    <div className="distance-meter" aria-label={`Archival distance ${distance}`}>
      <div className="distance-meter__labels">
        <span>AUTHOR</span>
        <span>WORK</span>
      </div>
      <div className="distance-meter__track">
        <span
          className="distance-meter__dot"
          style={{ left: `calc(${left}% - 4px)` }}
        />
      </div>
      <p className="distance-meter__value">{distance.toUpperCase()}</p>
    </div>
  );
}
