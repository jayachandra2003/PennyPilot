import React from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { formatINR } from "../../lib/currency";
import type { BudgetPace, MonthlySummary } from "../../lib/api";

interface VerdictStripProps {
  year: number;
  month: number;
  summary?: MonthlySummary;
  pace?: BudgetPace;
  onMonthChange: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const VerdictStrip: React.FC<VerdictStripProps> = ({
  year,
  month,
  summary,
  pace,
  onMonthChange,
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

  const income = summary?.income_paise || 0;
  const expense = summary?.expense_paise || 0;
  const net = summary?.net_balance_paise || 0;
  const savingsRate = summary?.savings_rate_percent || 0;

  return (
    <div className="bg-ledger-surface p-6 md:p-8 rounded-2xl border border-ledger-border shadow-card space-y-6">
      {/* Top Strip: Month Selector & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ledger-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-ledger-bg border border-ledger-border rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs md:text-sm font-serif font-bold text-ledger-ink select-none">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs text-ledger-inkSubtle">Normalized to 1st of month</span>
        </div>

        {/* Pacing Badge */}
        {pace && (
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              pace.status === "on_track"
                ? "bg-ledger-sageLight text-ledger-sage border-ledger-sage/30"
                : pace.status === "caution"
                ? "bg-ledger-amberLight text-ledger-amber border-ledger-amber/30"
                : "bg-ledger-redLight text-ledger-red border-ledger-red/30"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            <span className="capitalize">{pace.status.replace("_", " ")}</span>
          </div>
        )}
      </div>

      {/* Main Computed Verdict Sentence (Largest type on screen) */}
      <div className="space-y-2">
        <div className="font-serif text-2xl md:text-4xl font-extrabold text-ledger-ink tracking-tight leading-tight">
          {pace ? (
            <span>
              <span className="text-ledger-teal">{formatINR(expense)}</span> spent,{" "}
              <span>{formatINR(pace.remaining_paise)}</span> left.{" "}
              <span className={pace.is_over_budget || pace.status === "over_pace" ? "text-ledger-red" : "text-ledger-sage"}>
                {pace.verdict_sentence}
              </span>
            </span>
          ) : (
            <span>{formatINR(expense)} spent in {monthLabel}.</span>
          )}
        </div>
        <p className="text-xs md:text-sm text-ledger-inkMuted">
          Verified financial calculation computed in pure Python integer paise. No LLM arithmetic.
        </p>
      </div>

      {/* 4 Essential KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-ledger-bg border border-ledger-border space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-ledger-inkMuted uppercase">
            <span>Income</span>
            <TrendingUp className="w-4 h-4 text-ledger-sage" />
          </div>
          <div className="font-serif text-xl md:text-2xl font-bold text-ledger-ink tabular-nums">
            {formatINR(income)}
          </div>
          <p className="text-[11px] text-ledger-inkSubtle">Salary & deposits</p>
        </div>

        <div className="p-4 rounded-xl bg-ledger-bg border border-ledger-border space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-ledger-inkMuted uppercase">
            <span>Expenses</span>
            <TrendingDown className="w-4 h-4 text-ledger-red" />
          </div>
          <div className="font-serif text-xl md:text-2xl font-bold text-ledger-ink tabular-nums">
            {formatINR(expense)}
          </div>
          <p className="text-[11px] text-ledger-inkSubtle">{summary?.transaction_count || 0} active transactions</p>
        </div>

        <div className="p-4 rounded-xl bg-ledger-bg border border-ledger-border space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-ledger-inkMuted uppercase">
            <span>Net Balance</span>
            <Wallet className="w-4 h-4 text-ledger-teal" />
          </div>
          <div className={`font-serif text-xl md:text-2xl font-bold tabular-nums ${net >= 0 ? "text-ledger-sage" : "text-ledger-red"}`}>
            {formatINR(net)}
          </div>
          <p className="text-[11px] text-ledger-inkSubtle">{net >= 0 ? "Net Positive" : "Deficit"}</p>
        </div>

        <div className="p-4 rounded-xl bg-ledger-bg border border-ledger-border space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-ledger-inkMuted uppercase">
            <span>Savings Rate</span>
            <PiggyBank className="w-4 h-4 text-ledger-amber" />
          </div>
          <div className="font-serif text-xl md:text-2xl font-bold text-ledger-ink tabular-nums">
            {savingsRate}%
          </div>
          <p className="text-[11px] text-ledger-inkSubtle">Target: &gt; 25%</p>
        </div>
      </div>
    </div>
  );
};
