import type { InterpretationLadderStep } from "@/types/interpretation";

export function InterpretationLadder({
  steps,
}: {
  steps: InterpretationLadderStep[];
}) {
  return (
    <ol className="interp-ladder">
      {steps.map((step, index) => (
        <li key={step.layer} className="interp-ladder__step">
          <p className="eyebrow">{step.label}</p>
          <p className="interp-ladder__summary">{step.summary}</p>
          {step.caution ? (
            <p className="interp-ladder__caution">{step.caution}</p>
          ) : null}
          {index < steps.length - 1 ? (
            <div className="interp-ladder__arrow" aria-hidden>
              ↓
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
