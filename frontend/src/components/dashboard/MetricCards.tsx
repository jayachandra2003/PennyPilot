import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Clock,
  Wallet,
  SlidersHorizontal,
  Target,
  PiggyBank,
  Sparkles,
  Plus,
} from "lucide-react";
import { formatINR } from "../../lib/currency";
import type { MonthlySummary, MonthlyBudgetOverview } from "../../lib/api";
import { GlassIcon } from "../common/GlassIcon";

interface MetricCardsProps {
  period?: "monthly" | "yearly";
  summary?: MonthlySummary;
  budgetsOverview?: MonthlyBudgetOverview;
  totalDays?: number;
  onEditBudget?: () => void;
  onManageIncome?: () => void;
  onQuickAdd?: () => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  period = "monthly",
  summary,
  budgetsOverview,
  totalDays = 30,
  onEditBudget,
  onManageIncome,
  onQuickAdd,
}) => {
  const isYearly = period === "yearly";
  const incomePaise = summary?.income_paise || 0;
  const expensePaise = summary?.expense_paise || 0;
  const netBalancePaise = summary?.net_balance_paise || 0;
  const transactionCount = summary?.transaction_count || 0;

  // Real derived budget ceiling calculations from verified budget allocations
  const monthlyCeilingPaise = budgetsOverview?.total_limit_paise ?? 0;
  const effectiveCeilingPaise = isYearly ? monthlyCeilingPaise * 12 : monthlyCeilingPaise;
  const remainingBufferPaise = Math.max(0, effectiveCeilingPaise - expensePaise);
  const dailyPacePaise = isYearly
    ? Math.round(effectiveCeilingPaise / 365)
    : totalDays > 0
    ? Math.round(effectiveCeilingPaise / totalDays)
    : 0;
  const utilizationPct =
    effectiveCeilingPaise > 0
      ? Math.min(999, (expensePaise / effectiveCeilingPaise) * 100)
      : 0;

  // Planned savings cushion: unallocated funds between income and allocated ceiling
  const plannedCushionPaise = Math.max(0, incomePaise - effectiveCeilingPaise);
  const isNetPositive = netBalancePaise >= 0;

  const isBrandNewAccount =
    transactionCount === 0 &&
    incomePaise === 0 &&
    effectiveCeilingPaise === 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Empty State Welcome Guidance (Zero false positive claims, clear setup paths) */}
      {isBrandNewAccount && (
        <div className="glass-panel p-6 rounded-2xl border border-teal-500/30 dark:border-teal-500/20 bg-gradient-to-r from-teal-500/5 via-emerald-500/5 to-transparent flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5">
            <GlassIcon icon={Sparkles} variant="teal" size="md" />
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
                Welcome to your financial overview
              </h3>
              <p className="text-xs text-ledger-inkMuted leading-relaxed max-w-xl">
                Start tracking your cash flow by adding your monthly income sources and defining budget limits for your essential expense categories.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {onManageIncome && (
              <button
                type="button"
                onClick={onManageIncome}
                className="btn-primary text-xs px-4 py-2 min-h-[44px] flex items-center justify-center gap-1.5 focus-ring cursor-pointer select-none"
              >
                <Plus className="w-4 h-4" />
                <span>Add Income</span>
              </button>
            )}
            {onQuickAdd && (
              <button
                type="button"
                onClick={onQuickAdd}
                className="btn-secondary text-xs px-4 py-2 min-h-[44px] flex items-center justify-center gap-1.5 focus-ring cursor-pointer select-none"
              >
                <span>Quick Add Expense</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Row 1: Total Income, Total Expenses, Actual Savings (Responsive 3-Card Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0">
        {/* 1. TOTAL INCOME (with redesigned genuine interactive Manage button) */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl h-full flex flex-col justify-between space-y-3 transition-all hover:border-emerald-500/40">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlassIcon icon={ArrowUpRight} variant="emerald" size="xs" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
                  Total Income
                </span>
              </div>
              {onManageIncome && (
                <button
                  type="button"
                  onClick={onManageIncome}
                  aria-label="Manage monthly income"
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 border border-emerald-500/30 transition-all cursor-pointer focus-ring shadow-xs min-h-[44px] sm:min-h-[32px] select-none"
                  title="Configure recurring and one-time income sources"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Manage</span>
                </button>
              )}
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-300 tracking-tight tabular-nums pt-1">
              {formatINR(incomePaise)}
            </div>
          </div>
          <p className="text-[11px] text-ledger-inkSubtle font-mono border-t border-ledger-borderSubtle/60 pt-2">
            {isYearly ? "Actual yearly deposits" : "Verified monthly inflow"}
          </p>
        </div>

        {/* 2. TOTAL EXPENSES */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl h-full flex flex-col justify-between space-y-3 transition-all hover:border-rose-500/40">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlassIcon icon={ArrowDownRight} variant="rose" size="xs" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
                  Total Expenses
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-400/20">
                {transactionCount} {transactionCount === 1 ? "entry" : "entries"}
              </span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight tabular-nums pt-1">
              {formatINR(expensePaise)}
            </div>
          </div>
          <p className="text-[11px] text-ledger-inkSubtle font-mono border-t border-ledger-borderSubtle/60 pt-2">
            {isYearly ? "Annual living costs & utility spend" : "Living costs, debits & utility spend"}
          </p>
        </div>

        {/* 3. ACTUAL SAVINGS (Net Retained Capital) */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl h-full flex flex-col justify-between space-y-3 transition-all hover:border-teal-500/40">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlassIcon
                  icon={isNetPositive ? Wallet : ShieldCheck}
                  variant={isNetPositive ? "teal" : "rose"}
                  size="xs"
                />
                <span className="text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
                  Actual Savings
                </span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase border ${
                  isNetPositive
                    ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/25 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-800 border-rose-500/25 dark:text-rose-300"
                }`}
              >
                <span>{isNetPositive ? "+ Surplus" : "- Deficit"}</span>
              </span>
            </div>
            <div
              className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight tabular-nums pt-1 ${
                isNetPositive
                  ? "text-ledger-ink dark:text-[#F1F3EF]"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatINR(netBalancePaise)}
            </div>
          </div>
          <p className="text-[11px] text-ledger-inkSubtle font-mono border-t border-ledger-borderSubtle/60 pt-2">
            {isYearly ? "Annual net capital retained" : "Net capital retained after outflows"}
          </p>
        </div>
      </div>

      {/* Row 2: Remaining Budget, Budget Utilization, Savings Cushion (Responsive 3-Card Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0">
        {/* 4. REMAINING BUDGET (with redesigned genuine interactive Edit Budget button) */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl h-full flex flex-col justify-between space-y-3 transition-all hover:border-teal-500/40">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlassIcon icon={Clock} variant="indigo" size="xs" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
                  Remaining Budget
                </span>
              </div>
              {onEditBudget && (
                <button
                  type="button"
                  onClick={onEditBudget}
                  aria-label="Edit category budgets"
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-500/15 hover:bg-teal-500/25 active:bg-teal-500/35 border border-teal-500/30 transition-all cursor-pointer focus-ring shadow-xs min-h-[44px] sm:min-h-[32px] select-none"
                  title="Modify monthly budget ceiling allocations"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Edit Budget</span>
                </button>
              )}
            </div>
            <div
              className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight tabular-nums pt-1 ${
                effectiveCeilingPaise > 0 && remainingBufferPaise === 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-ledger-teal dark:text-ledger-teal"
              }`}
            >
              {formatINR(remainingBufferPaise)}
            </div>
          </div>
          <p className="text-[11px] text-ledger-inkSubtle font-mono border-t border-ledger-borderSubtle/60 pt-2 truncate">
            {effectiveCeilingPaise > 0
              ? isYearly
                ? `of ${formatINR(effectiveCeilingPaise)} annual ceiling`
                : `of ${formatINR(effectiveCeilingPaise)} ceiling`
              : "No ceiling configured"}
          </p>
        </div>

        {/* 5. BUDGET UTILIZATION (with prominent percentage value matching PDF reference) */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl h-full flex flex-col justify-between space-y-3 transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlassIcon icon={Target} variant="amber" size="xs" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
                  Budget Utilization
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold text-ledger-ink">
                {utilizationPct.toFixed(1)}%
              </span>
            </div>
            {/* Bold Display Figure */}
            <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight tabular-nums pt-1 text-ledger-ink">
              {utilizationPct.toFixed(1)}%
            </div>
            {/* Meter Bar */}
            <div className="pt-1">
              <div className="w-full h-2 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden border border-white/20 dark:border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    utilizationPct > 100
                      ? "bg-rose-500"
                      : utilizationPct > 80
                      ? "bg-amber-400"
                      : "bg-teal-500"
                  }`}
                  style={{ width: `${Math.min(100, utilizationPct)}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-ledger-inkSubtle font-mono border-t border-ledger-borderSubtle/60 pt-2">
            {effectiveCeilingPaise > 0
              ? `Daily pace: ${formatINR(dailyPacePaise)}/day`
              : "No budget active"}
          </p>
        </div>

        {/* 6. PLANNED SAVINGS CUSHION */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl h-full flex flex-col justify-between space-y-3 transition-all hover:border-amber-500/40">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GlassIcon icon={PiggyBank} variant="amber" size="xs" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
                  Savings Cushion
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                Unallocated
              </span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-300 tracking-tight tabular-nums pt-1">
              {formatINR(plannedCushionPaise)}
            </div>
          </div>
          <p className="text-[11px] text-ledger-inkSubtle font-mono border-t border-ledger-borderSubtle/60 pt-2 truncate">
            {plannedCushionPaise > 0
              ? isYearly
                ? "Annual surplus above budget ceilings"
                : "Surplus above budget ceilings"
              : incomePaise > 0
              ? "Budgets fully allocate income"
              : "Awaiting income setup"}
          </p>
        </div>
      </div>
    </div>
  );
};
