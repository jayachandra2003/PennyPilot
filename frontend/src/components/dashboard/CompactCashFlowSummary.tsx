import React from "react";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Target } from "lucide-react";
import { formatINR } from "../../lib/currency";
import type { MonthlySummary } from "../../lib/api";
import { GlassIcon } from "../common/GlassIcon";

interface CompactCashFlowSummaryProps {
  period: "monthly" | "yearly";
  summary?: MonthlySummary;
}

export const CompactCashFlowSummary: React.FC<CompactCashFlowSummaryProps> = ({
  period,
  summary,
}) => {
  const incomePaise = summary?.income_paise || 0;
  const expensePaise = summary?.expense_paise || 0;
  const netBalancePaise = summary?.net_balance_paise || 0;
  const savingsRate = summary?.savings_rate_percent || 0;
  const isNetPositive = netBalancePaise >= 0;
  const isDisciplined = savingsRate >= 25.0;

  // Visual cash flow retention ratio
  const outflowRatio = incomePaise > 0 ? Math.min(100, (expensePaise / incomePaise) * 100) : 0;
  const retainedRatio = isNetPositive && incomePaise > 0 ? Math.max(0, 100 - outflowRatio) : 0;

  // Max for the comparative mini bars
  const maxCashFlow = Math.max(incomePaise, expensePaise, 1);
  const inflowBarPct = Math.min(100, (incomePaise / maxCashFlow) * 100);
  const outflowBarPct = Math.min(100, (expensePaise / maxCashFlow) * 100);

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-2xl h-full flex flex-col justify-between space-y-4">
      {/* Header with Supporting Savings Rate Pill & Balance Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ledger-borderSubtle pb-3">
        <div className="flex items-center gap-2">
          <GlassIcon icon={Wallet} variant={isNetPositive ? "teal" : "rose"} size="xs" />
          <h3 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
            {period === "yearly" ? "Annual Cash Flow" : "Monthly Cash Flow"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Savings Rate Small Supporting Metric Pill */}
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
              isDisciplined
                ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300"
                : "bg-teal-500/10 text-teal-800 border-teal-500/25 dark:text-teal-300"
            }`}
            title={`Savings Rate: ${savingsRate.toFixed(1)}% (Target baseline: 25%)`}
          >
            <Target className="w-3 h-3 text-ledger-teal shrink-0" />
            <span>Savings Rate:</span>
            <span className="font-bold">{savingsRate.toFixed(1)}%</span>
          </div>

          {/* Surplus / Deficit Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border ${
              isNetPositive
                ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300"
                : "bg-rose-500/10 text-rose-800 border-rose-500/25 dark:text-rose-300"
            }`}
          >
            {isNetPositive ? "+ Surplus" : "- Deficit"}
          </span>
        </div>
      </div>

      {/* Mini Comparative Bars for Inflow & Outflow (PDF Reference Page 1) */}
      <div className="space-y-2 py-1 px-1">
        {/* Inflow mini bar */}
        <div className="flex items-center gap-3 text-xs">
          <span className="w-12 sm:w-14 font-mono text-[11px] text-ledger-inkSubtle shrink-0">Inflow</span>
          <div className="flex-1 h-2 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-ledger-teal dark:bg-ledger-teal rounded-full transition-all duration-500"
              style={{ width: `${inflowBarPct}%` }}
            />
          </div>
          <span className="font-serif font-bold text-xs sm:text-sm text-ledger-ink tabular-nums w-24 sm:w-28 text-right shrink-0">
            {formatINR(incomePaise)}
          </span>
        </div>

        {/* Outflow mini bar */}
        <div className="flex items-center gap-3 text-xs">
          <span className="w-12 sm:w-14 font-mono text-[11px] text-ledger-inkSubtle shrink-0">Outflow</span>
          <div className="flex-1 h-2 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-400 dark:bg-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${outflowBarPct}%` }}
            />
          </div>
          <span className="font-serif font-bold text-xs sm:text-sm text-ledger-ink tabular-nums w-24 sm:w-28 text-right shrink-0">
            {formatINR(expensePaise)}
          </span>
        </div>
      </div>

      {/* 3-Column Key Figures Grid: Total Inflow, Total Outflow, Net Savings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* 1. Total Inflow */}
        <div className="p-3.5 rounded-xl bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle flex flex-col justify-between space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="uppercase">Total Inflow</span>
          </div>
          <div className="font-serif text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {formatINR(incomePaise)}
          </div>
          <p className="text-[10px] text-ledger-inkSubtle font-mono">
            {period === "yearly" ? "Yearly deposits" : "Verified inflow"}
          </p>
        </div>

        {/* 2. Total Outflow */}
        <div className="p-3.5 rounded-xl bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle flex flex-col justify-between space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-rose-600 dark:text-rose-400">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="uppercase">Total Outflow</span>
          </div>
          <div className="font-serif text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
            {formatINR(expensePaise)}
          </div>
          <p className="text-[10px] text-ledger-inkSubtle font-mono">
            {summary?.transaction_count || 0} debits recorded
          </p>
        </div>

        {/* 3. Net Savings */}
        <div className="p-3.5 rounded-xl bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle flex flex-col justify-between space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-ledger-ink">
            <TrendingUp className="w-3.5 h-3.5 text-ledger-teal" />
            <span className="uppercase">Net Savings</span>
          </div>
          <div
            className={`font-serif text-lg sm:text-xl font-bold tabular-nums ${
              isNetPositive
                ? "text-ledger-teal dark:text-ledger-teal"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatINR(netBalancePaise)}
          </div>
          <p className="text-[10px] text-ledger-inkSubtle font-mono">
            {isDisciplined ? `${savingsRate.toFixed(1)}% rate (Disciplined)` : `${savingsRate.toFixed(1)}% (Baseline: 25%)`}
          </p>
        </div>
      </div>

      {/* Visual Cash Flow Retention Ratio Bar */}
      <div className="space-y-2 pt-2 border-t border-ledger-borderSubtle">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-ledger-inkMuted font-medium">Cash flow allocation</span>
          <span className="text-ledger-inkSubtle text-[11px]">
            {incomePaise > 0
              ? `${retainedRatio.toFixed(0)}% retained · ${outflowRatio.toFixed(0)}% spent`
              : "Awaiting recorded income"}
          </span>
        </div>

        {/* Visual segmented comparison bar */}
        <div className="w-full h-2.5 bg-slate-200/60 dark:bg-white/5 rounded-full overflow-hidden flex border border-white/20 dark:border-white/5">
          {incomePaise > 0 ? (
            <>
              {/* Retained portion */}
              {isNetPositive && (
                <div
                  className="h-full bg-ledger-teal dark:bg-ledger-teal transition-all duration-500"
                  style={{ width: `${retainedRatio}%` }}
                  title={`Retained: ${retainedRatio.toFixed(1)}%`}
                />
              )}
              {/* Outflow portion */}
              <div
                className="h-full bg-rose-400 dark:bg-rose-500/80 transition-all duration-500"
                style={{ width: `${outflowRatio}%` }}
                title={`Outflow: ${outflowRatio.toFixed(1)}%`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-slate-300/30 dark:bg-white/5" />
          )}
        </div>
      </div>
    </div>
  );
};
