import React from "react";
import { AlertTriangle, Clock, ShieldCheck, ArrowRight } from "lucide-react";
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
      actionLabel: "Adjust Budgets",
      action: onNavigateToBudgets,
    });
  }

  // 2. Anomaly Spike Insight (Median Absolute Deviation Engine)
  if (anomalies.length > 0) {
    const top = anomalies[0];
    cards.push({
      id: "anomaly",
      title: `Statistical Outlier Detected: ${top.description}`,
      evidence: top.evidence,
      severity: "warning" as const,
      icon: AlertTriangle,
      actionLabel: "View in Ledger",
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
      icon: ShieldCheck,
      actionLabel: "Explore Trends",
      action: onNavigateToTransactions,
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Intelligence
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
            Grounded Financial Signals
          </h3>
        </div>
        <span className="text-xs font-mono text-ledger-inkSubtle">
          Evidence-verified Python models
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 min-w-0">
        {cards.slice(0, 3).map((c) => {
          const Icon = c.icon;
          const isWarning = c.severity === "warning";
          const isPositive = c.severity === "positive";

          return (
            <div
              key={c.id}
              className={`card-base p-4 sm:p-5 flex flex-col justify-between space-y-3 transition-colors min-w-0 overflow-hidden ${
                isWarning
                  ? "border-ledger-amber/40 bg-ledger-surface"
                  : isPositive
                  ? "border-ledger-sage/40 bg-ledger-surface"
                  : "border-ledger-border bg-ledger-surface"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${
                      isWarning
                        ? "bg-ledger-amberLight text-ledger-amber border-ledger-amber/30"
                        : isPositive
                        ? "bg-ledger-sageLight text-ledger-sage border-ledger-sage/30"
                        : "bg-ledger-tealLight text-ledger-teal border-ledger-teal/30"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-ledger-ink line-clamp-1">
                    {c.title}
                  </h4>
                </div>
                <p className="text-xs text-ledger-inkMuted leading-relaxed">
                  {c.evidence}
                </p>
              </div>

              <div className="pt-2 border-t border-ledger-borderSubtle flex justify-end">
                <button
                  onClick={c.action}
                  className="text-xs font-medium text-ledger-teal hover:text-ledger-tealHover flex items-center gap-1 focus-ring py-0.5 px-1 rounded"
                >
                  <span>{c.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
