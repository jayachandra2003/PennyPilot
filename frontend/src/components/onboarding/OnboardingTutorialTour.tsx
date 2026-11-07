import React from "react";
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  BarChart3,
  Lightbulb,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Compass,
} from "lucide-react";
import { GlassIcon } from "../common/GlassIcon";

export interface TutorialStep {
  id: string;
  tab: string;
  title: string;
  subtitle: string;
  description: string;
  highlightPill: string;
  icon: React.ElementType;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "dashboard",
    tab: "dashboard",
    title: "Financial Overview Dashboard",
    subtitle: "Core Inflow, Outflow & Capital Retention",
    description:
      "Monitor your verified monthly cash flow in strict integer paise. Track your verified income inflow, living expenses, net retained savings, and budget buffer at a single glance with zero financial hallucination.",
    highlightPill: "Verified Inflow, Outflow & Savings",
    icon: LayoutDashboard,
  },
  {
    id: "transactions",
    tab: "transactions",
    title: "Deterministic Transactions Ledger",
    subtitle: "Quick Add, Receipt Scanning & Exports",
    description:
      "Use Quick Add to parse plain Indian English phrases or capture receipts directly using your camera or file upload. Record debits and credits, attach notes, and export high-integrity financial records in CSV, PDF, or DOCX.",
    highlightPill: "Quick Add, Receipt OCR & Export Engine",
    icon: ReceiptText,
  },
  {
    id: "budgets",
    tab: "budgets",
    title: "Category Spending Ceilings",
    subtitle: "Dynamic Pacing & Daily Burn Velocity",
    description:
      "Establish monthly spending limits per category. PennyPilot's deterministic budget engine computes real-time daily burn rates and calendar pacing drift to keep you under your planned limits.",
    highlightPill: "Real-Time Velocity & Pacing Indicators",
    icon: PieChart,
  },
  {
    id: "analytics",
    tab: "analytics",
    title: "Historical Financial Analytics",
    subtitle: "6-Month Retrospective Progression",
    description:
      "Inspect multi-month cash flow trajectories, savings rate shifts, and month-over-month category breakdown patterns across your entire verified transaction history.",
    highlightPill: "6-Month Retrospective & MoM Shifts",
    icon: BarChart3,
  },
  {
    id: "insights",
    tab: "insights",
    title: "Statistical Signals & Anomaly Detection",
    subtitle: "Outlier Spikes & Pacing Alerts",
    description:
      "Automated Median Absolute Deviation (MAD) anomaly detection flags atypical spending spikes and alerts you to budget pace drift well before calendar month-end.",
    highlightPill: "MAD Outlier Engine & Capital Buffer",
    icon: Lightbulb,
  },
  {
    id: "copilot",
    tab: "copilot",
    title: "Institutional AI Copilot",
    subtitle: "FactBundle Intelligence & NL Quick-Add",
    description:
      "Converse with your private financial intelligence assistant or use natural-language transaction entry. All answers are grounded strictly in verified Python FactBundles with zero hallucination.",
    highlightPill: "Zero Hallucination FactBundles",
    icon: Sparkles,
  },
];

interface OnboardingTutorialTourProps {
  isOpen: boolean;
  currentStepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onNavigateTab: (tab: string) => void;
}

export const OnboardingTutorialTour: React.FC<OnboardingTutorialTourProps> = ({
  isOpen,
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const totalSteps = TUTORIAL_STEPS.length;
  const step = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const handleNextClick = () => {
    if (isLastStep) {
      onFinish();
    } else {
      const nextIndex = currentStepIndex + 1;
      onNavigateTab(TUTORIAL_STEPS[nextIndex].tab);
      onNext();
    }
  };

  const handlePrevClick = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      onNavigateTab(TUTORIAL_STEPS[prevIndex].tab);
      onPrev();
    }
  };

  return (
    <aside
      aria-label="First-time onboarding guided tour"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 md:right-8 z-40 max-w-[420px] w-[calc(100vw-2rem)] sm:w-full animate-fade-in transition-all duration-300"
    >
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-teal-500/30 dark:border-teal-500/25 bg-white dark:bg-[#141F2E] shadow-[0_12px_36px_-6px_rgba(15,23,42,0.18)] dark:shadow-[0_12px_36px_-6px_rgba(0,0,0,0.6)] space-y-4">
        {/* Top Header: Step Badge, Compass Icon & Dismiss/Skip */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 dark:bg-teal-500/20 text-ledger-teal flex items-center justify-center border border-teal-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-ledger-teal">
                  Product Tour
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-medium">
                  Step {currentStepIndex + 1} of {totalSteps}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors focus-ring"
            aria-label="Skip onboarding tour"
            title="Skip tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6-Segment Progress Line */}
        <div className="grid grid-cols-6 gap-1.5" role="progressbar" aria-valuenow={currentStepIndex + 1} aria-valuemin={1} aria-valuemax={totalSteps}>
          {TUTORIAL_STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx <= currentStepIndex
                  ? "bg-ledger-teal dark:bg-teal-400"
                  : "bg-slate-200 dark:bg-slate-700/60"
              }`}
            />
          ))}
        </div>

        {/* Content Body: Feature Title, Subtitle, Description & Pill */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <GlassIcon icon={step.icon} variant="teal" size="sm" />
            <div className="space-y-1">
              <h3 className="font-serif text-base sm:text-lg font-bold text-slate-900 dark:text-[#F1F3EF] leading-snug">
                {step.title}
              </h3>
              <p className="text-xs font-medium text-ledger-teal">
                {step.subtitle}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
            {step.description}
          </p>

          <div className="pt-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span>{step.highlightPill}</span>
            </span>
          </div>
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-1.5 focus-ring rounded-lg cursor-pointer"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrevClick}
                className="btn-secondary text-xs px-3 py-1.5 min-h-[34px] flex items-center gap-1 cursor-pointer focus-ring"
                aria-label="Previous tutorial step"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNextClick}
              className="btn-primary text-xs px-3.5 py-1.5 min-h-[34px] flex items-center gap-1.5 cursor-pointer focus-ring"
              aria-label={isLastStep ? "Finish tutorial" : "Next tutorial step"}
            >
              <span>{isLastStep ? "Finish" : "Next"}</span>
              {isLastStep ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
