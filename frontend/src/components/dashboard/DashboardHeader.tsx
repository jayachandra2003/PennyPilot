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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>On Track</span>
          </span>
        );
      case "caution":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Caution</span>
          </span>
        );
      case "over_pace":
      case "over_budget":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide uppercase bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{pace.status === "over_budget" ? "Over Budget" : "Over Pace"}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-3 sm:pb-4 min-w-0">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0">
          {/* Month Switcher */}
          <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shrink-0">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors focus-ring"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-semibold text-slate-800 select-none">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors focus-ring"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs font-medium text-slate-500 hidden md:inline shrink-0">
            Financial Overview
          </span>
        </div>

        {/* Right Action & Status Group */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 min-w-0">
          {getPaceBadge()}
          <button
            onClick={onQuickAdd}
            className="btn-primary text-xs sm:text-sm px-3.5 py-2 min-h-[36px] focus-ring shrink-0"
            title="Record transaction with natural language"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Main Computed Monthly Verdict Display */}
      <div className="space-y-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Monthly Verdict</span>
          </span>
        </div>

        {/* Primary Figures: Amount Spent and Remaining Buffer */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 min-w-0">
          <div className="font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight tabular-nums break-words">
            {formatINR(totalExpensePaise)} <span className="font-normal text-xs sm:text-sm text-slate-500 uppercase tracking-wider">spent</span>
          </div>
          {pace && (
            <>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <div className="font-sans text-lg sm:text-xl md:text-2xl font-semibold text-teal-700 tracking-tight tabular-nums break-words">
                {formatINR(pace.remaining_paise)} <span className="font-normal text-xs text-slate-400 uppercase tracking-wider">remaining</span>
              </div>
            </>
          )}
        </div>

        {/* Structured Controlled Status / Projection Callout */}
        {pace && (
          <div
            className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed min-w-0 break-words ${
              pace.is_over_budget || pace.status === "over_pace"
                ? "bg-amber-50 border-amber-200 text-amber-950"
                : pace.status === "caution"
                ? "bg-amber-50/60 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-950"
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

        <p className="text-xs text-slate-400">
          Deterministic integer paise calculations with verified FactBundle grounding.
        </p>
      </div>
    </div>
  );
};
