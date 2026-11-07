import React, { useState } from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";

interface OnboardingReminderBannerProps {
  onOpenWizard: () => void;
}

export const OnboardingReminderBanner: React.FC<OnboardingReminderBannerProps> = ({
  onOpenWizard,
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem("pennypilot_onboarding_dismissed") === "true";
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("pennypilot_onboarding_dismissed", "true");
    setIsDismissed(true);
  };

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-ledger-teal/15 via-ledger-teal/5 to-transparent border border-ledger-teal/30 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-ledger-teal/20 border border-ledger-teal/30 flex items-center justify-center text-ledger-teal shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-ledger-ink">
            Complete Your Financial Plan
          </h4>
          <p className="text-[11px] sm:text-xs text-ledger-inkSubtle">
            Set up your monthly income and category budgets to unlock accurate savings intelligence.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button
          type="button"
          onClick={onOpenWizard}
          className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 font-semibold"
        >
          <span>Set Up Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-ledger-inkSubtle hover:text-ledger-ink hover:bg-ledger-surface transition-colors"
          title="Dismiss reminder"
          aria-label="Dismiss reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
