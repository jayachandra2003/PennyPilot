import React from "react";
import { AlertTriangle, Clock, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import type { AnomalyItem, BudgetPace, MonthlySummary } from "../../lib/api";
import { formatINR } from "../../lib/currency";

interface InsightCardsProps {
  pace?: BudgetPace;
  anomalies: AnomalyItem[];
  summary?: MonthlySummary;
  onNavigateToBudgets: () => void;
  onNavigateToTransactions: () => void;
}

export const InsightCards: React.FC<InsightCardsProps> = ({
  pace,
  anomalies,
  summary,
  onNavigateToBudgets,
  onNavigateToTransactions,
}) => {
  const cards = [];

  // 1. Budget Pace Insight
  if (pace) {
    const isOver = pace.status === "over_budget" || pace.status === "over_pace";
    cards.push({
      id: "pace",
      title: isOver ? "Budget Pace Warning" : "Budget Pace On Track",
      evidence: pace.verdict_sentence,
      severity: isOver ? ("warning" as const) : ("positive" as const),
      icon: Clock,
      actionLabel: "Adjust Allocations",
      action: onNavigateToBudgets,
    });
  }

  // 2. Anomaly Spike Insight (Median Absolute Deviation Engine)
  if (anomalies.length > 0) {
    const top = anomalies[0];
    cards.push({
      id: "anomaly",
      title: `Outlier Detected: ${top.description}`,
      evidence: top.evidence,
      severity: "warning" as const,
      icon: AlertTriangle,
      actionLabel: "Inspect in Ledger",
      action: onNavigateToTransactions,
    });
  }

  // 3. Savings Rate Discipline Signal
  if (summary && summary.income_paise > 0) {
    const rate = summary.savings_rate_percent;
    const isGood = rate >= 25.0;
    cards.push({
      id: "savings",
      title: isGood ? "Strong Savings Discipline" : "Savings Rate Below Target",
      evidence: isGood
        ? `You have preserved ${rate}% (${formatINR(summary.net_balance_paise)}) of your monthly income so far.`
        : `Current savings rate is ${rate}%, below your recommended 25% target baseline.`,
      severity: isGood ? ("positive" as const) : ("info" as const),
      icon: isGood ? CheckCircle2 : ShieldCheck,
      actionLabel: "Explore Trends",
      action: onNavigateToTransactions,
    });
  }

  return (
    <div className="glass-panel p-5 sm:p-6 space-y-4 rounded-2xl">
      {/* Header */}
      <div className="border-b border-ledger-borderSubtle pb-3">
        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold block">
          Signals & Intelligence
        </span>
        <h3 className="font-serif text-base sm:text-lg font-bold text-ledger-ink mt-0.5">
          Financial Insights
        </h3>
      </div>

      {cards.length === 0 ? (
        <div className="py-6 text-center space-y-1.5 bg-ledger-surfaceSubtle/30 rounded-xl border border-dashed border-ledger-border">
          <ShieldCheck className="w-7 h-7 text-ledger-teal mx-auto opacity-70" />
          <p className="text-xs font-semibold text-ledger-ink">All signals normal</p>
          <p className="text-[11px] text-ledger-inkSubtle max-w-xs mx-auto">
            Spending pace and transaction anomalies are within expected parameters.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-ledger-borderSubtle">
          {cards.slice(0, 3).map((c) => {
            const Icon = c.icon;
            const isWarning = c.severity === "warning";
            const isPositive = c.severity === "positive";

            return (
              <div key={c.id} className="pt-3.5 first:pt-0 pb-3.5 last:pb-0 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border backdrop-blur-md mt-0.5 ${
                      isWarning
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : isPositive
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-ledger-ink line-clamp-1">
                      {c.title}
                    </h4>
                    <p className="text-xs text-ledger-inkMuted leading-relaxed mt-0.5">
                      {c.evidence}
                    </p>
                    <div className="pt-2 flex justify-start sm:justify-end">
                      <button
                        type="button"
                        onClick={c.action}
                        className="text-xs font-semibold text-ledger-teal hover:text-ledger-tealHover inline-flex items-center gap-1 focus-ring py-0.5 px-2 rounded-lg hover:bg-ledger-surfaceSubtle transition-colors cursor-pointer select-none"
                      >
                        <span>{c.actionLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
