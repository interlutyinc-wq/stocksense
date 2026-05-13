import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function WizardFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center font-mono text-sm text-ss-cream/50">
      Loading…
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<WizardFallback />}>
      <OnboardingWizard />
    </Suspense>
  );
}
