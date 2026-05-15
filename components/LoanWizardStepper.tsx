interface LoanWizardStepperProps {
  currentStep: number;
  totalSteps: number;
}

export function LoanWizardStepper({ currentStep, totalSteps }: LoanWizardStepperProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`flex-1 h-1.5 rounded-full transition-colors ${
            step <= currentStep ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}
