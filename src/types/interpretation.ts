export type InterpretationLayer =
  | "source-text"
  | "archive-interpretation"
  | "writer-perspective"
  | "modern-transfer"
  | "ai-inference";

export type DistanceBand = "low" | "medium" | "high";

/**
 * Curator向け risk signal。自動真実判定ではない。
 */
export interface InterpretationDistance {
  sourceToFragment: DistanceBand;
  fragmentToPerspective: DistanceBand;
  perspectiveToModernTransfer: DistanceBand;
}

export interface InterpretationLadderStep {
  layer: InterpretationLayer;
  label: string;
  summary: string;
  isAuthorial: boolean;
  caution?: string;
}
