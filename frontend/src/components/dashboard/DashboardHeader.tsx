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
    <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-ledger-borderSubtle pb-3 sm:pb-4 min-w-0">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0">
          {/* Month Switcher */}
          <div className="inline-flex items-center bg-ledger-surfaceSubtle border border-ledger-border rounded-md p-0.5 shrink-0">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink transition-colors focus-ring"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-ledger-ink select-none font-mono">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center rounded hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink transition-colors focus-ring"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[11px] font-mono text-ledger-inkSubtle hidden md:inline shrink-0">
            Monthly Ledger
          </span>
        </div>

        {/* Right Action & Status Group */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 min-w-0">
          {getPaceBadge()}
          <button
            onClick={onQuickAdd}
            className="btn-primary text-xs sm:text-sm px-3 py-1.5 min-h-[36px] focus-ring shrink-0"
            title="Record transaction with natural language"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Main Computed Monthly Verdict Display */}
      <div className="space-y-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-ledger-teal" />
            <span>Computed Monthly Verdict</span>
          </span>
        </div>

        {/* Primary Figures: Amount Spent and Remaining Buffer */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 min-w-0">
          <div className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums break-words">
            {formatINR(totalExpensePaise)} <span className="font-sans font-normal text-xs sm:text-sm text-ledger-inkMuted uppercase tracking-wider">spent</span>
          </div>
          {pace && (
            <>
              <span className="text-ledger-inkSubtle hidden sm:inline">•</span>
              <div className="font-serif text-base sm:text-lg md:text-xl font-semibold text-ledger-teal tracking-tight tabular-nums break-words">
                {formatINR(pace.remaining_paise)} <span className="font-sans font-normal text-xs text-ledger-inkSubtle uppercase tracking-wider">remaining</span>
              </div>
            </>
          )}
        </div>

        {/* Structured Controlled Status / Projection Callout */}
        {pace && (
          <div
            className={`flex items-start gap-2.5 p-3 rounded-md border text-xs sm:text-sm leading-relaxed min-w-0 break-words ${
              pace.is_over_budget || pace.status === "over_pace"
                ? "bg-amber-50/80 border-amber-200/80 text-amber-950"
                : pace.status === "caution"
                ? "bg-amber-50/50 border-amber-200/60 text-amber-900"
                : "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {pace.is_over_budget || pace.status === "over_pace" ? (
                <AlertCircle className="w-4 h-4 text-amber-700" />
              ) : pace.status === "caution" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium">
                {pace.verdict_sentence}
              </span>
            </div>
          </div>
        )}

        <p className="text-[11px] sm:text-xs text-ledger-inkMuted">
          Pure deterministic Python integer paise arithmetic. Zero LLM calculations.
        </p>
      </div>
    </div>
  );
};
