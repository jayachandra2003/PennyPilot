import React from "react";
import { ChevronLeft, ChevronRight, Plus, Sparkles, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { formatINR } from "../../lib/currency";
import type { BudgetPace } from "../../lib/api";

interface DashboardHeaderProps {
  year: number;
  month: number;
  pace?: BudgetPace;
  totalExpensePaise: number;
  onMonthChange: (year: number, month: number) => void;
  onQuickAdd: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  year,
  month,
  pace,
  totalExpensePaise,
  onMonthChange,
  onQuickAdd,
}) => {
  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const getPaceBadge = () => {
    if (!pace) return null;
    switch (pace.status) {
      case "on_track":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium tracking-wide uppercase bg-ledger-sageLight text-ledger-sage border border-ledger-sage/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>On Track</span>
          </span>
        );
      case "caution":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium tracking-wide uppercase bg-ledger-amberLight text-ledger-amber border border-ledger-amber/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Caution</span>
          </span>
        );
      case "over_pace":
      case "over_budget":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium tracking-wide uppercase bg-ledger-redLight text-ledger-red border border-ledger-red/20">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{pace.status === "over_budget" ? "Over Budget" : "Over Pace"}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card p-5 md:p-6 space-y-4">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ledger-borderSubtle pb-4">
        <div className="flex items-center gap-3">
          {/* Month Switcher */}
          <div className="inline-flex items-center bg-ledger-surfaceSubtle border border-ledger-border rounded-md p-0.5">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink transition-colors focus-ring"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-semibold text-ledger-ink select-none font-mono">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink transition-colors focus-ring"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[11px] font-mono text-ledger-inkSubtle hidden sm:inline">
            Monthly Ledger
          </span>
        </div>

        {/* Right Action & Status Group */}
        <div className="flex items-center gap-3">
          {getPaceBadge()}
          <button
            onClick={onQuickAdd}
            className="btn-primary text-xs sm:text-sm focus-ring"
            title="Record transaction with natural language"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add Expense</span>
          </button>
        </div>
      </div>

      {/* Main Computed Monthly Verdict Display */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-ledger-teal" />
            <span>Computed Monthly Verdict</span>
          </span>
        </div>
        <div className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-ledger-ink tracking-tight leading-snug">
          {pace ? (
            <span>
              <span className="text-ledger-ink">{formatINR(totalExpensePaise)}</span> spent,{" "}
              <span className="text-ledger-inkMuted">{formatINR(pace.remaining_paise)}</span> remaining.{" "}
              <span
                className={
                  pace.is_over_budget || pace.status === "over_pace"
                    ? "text-ledger-amber"
                    : "text-ledger-sage"
                }
              >
                {pace.verdict_sentence}
              </span>
            </span>
          ) : (
            <span>{formatINR(totalExpensePaise)} spent in {monthLabel}.</span>
          )}
        </div>
        <p className="text-xs text-ledger-inkMuted">
          Pure deterministic Python integer paise arithmetic. Zero LLM calculations.
        </p>
      </div>
    </div>
  );
};
