import React from "react";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ShieldCheck, Clock } from "lucide-react";
import { formatINR } from "../../lib/currency";
import type { MonthlySummary } from "../../lib/api";

interface MetricCardsProps {
  summary?: MonthlySummary;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary }) => {
  const incomePaise = summary?.income_paise || 0;
  const expensePaise = summary?.expense_paise || 0;
  const netBalancePaise = summary?.net_balance_paise || 0;
  const savingsRate = summary?.savings_rate_percent || 0;
  const transactionCount = summary?.transaction_count || 0;

  const isNetPositive = netBalancePaise >= 0;
  const isDisciplinedSavings = savingsRate >= 25.0;

  return (
    <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card overflow-hidden min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-ledger-borderSubtle">
        {/* PANEL 1: Primary Hero Metric — Net Retained Capital (5 cols) */}
        <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ledger-inkSubtle font-medium">
                Net Retained Capital
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wide border ${
                  isNetPositive
                    ? "bg-ledger-sageLight text-ledger-sage border-ledger-sage/20"
                    : "bg-ledger-redLight text-ledger-red border-ledger-red/20"
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                <span>{isNetPositive ? "+ Surplus" : "- Deficit"}</span>
              </span>
            </div>
            <div className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ledger-ink tabular-nums break-words pt-1">
              {formatINR(netBalancePaise)}
            </div>
            <p className="text-xs text-ledger-inkMuted">
              Net balance retained after all recorded monthly living expenses and outflows.
            </p>
          </div>

          {/* Retention Ratio Bar */}
          <div className="space-y-1.5 pt-2 border-t border-ledger-borderSubtle">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ledger-inkMuted font-medium">Monthly Savings Rate</span>
              <span className="font-mono font-bold text-ledger-sage tabular-nums">
                {savingsRate.toFixed(2)}%
              </span>
            </div>
            <div className="w-full h-2 bg-ledger-surfaceSubtle rounded-full overflow-hidden border border-ledger-borderSubtle">
              <div
                className="h-full bg-ledger-sage rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-ledger-inkSubtle">
              <span>{isDisciplinedSavings ? "Disciplined (>25% target)" : "Below recommended target"}</span>
              <span>Baseline: 25.0%</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: Inflow & Outflow Channels (4 cols) */}
        <div className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between divide-y divide-ledger-borderSubtle space-y-4 lg:space-y-0">
          {/* Monthly Inflow */}
          <div className="pb-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ledger-inkSubtle font-medium flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-ledger-sage" />
                <span>Monthly Inflow</span>
              </span>
              <span className="text-[11px] font-mono text-ledger-sage font-medium bg-ledger-sageLight px-1.5 py-0.5 rounded border border-ledger-sage/20">
                Credits
              </span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-ledger-sage tracking-tight tabular-nums">
              {formatINR(incomePaise)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-ledger-inkSubtle">
              <TrendingUp className="w-3 h-3 text-ledger-sage" />
              <span>Verified salary, deposits & investments</span>
            </div>
          </div>

          {/* Monthly Outflow */}
          <div className="pt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-ledger-inkSubtle font-medium flex items-center gap-1.5">
                <ArrowDownRight className="w-3.5 h-3.5 text-ledger-inkMuted" />
                <span>Monthly Outflow</span>
              </span>
              <span className="text-[11px] font-mono text-ledger-inkSubtle bg-ledger-surfaceSubtle px-1.5 py-0.5 rounded border border-ledger-borderSubtle">
                {transactionCount} txs
              </span>
            </div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums">
              {formatINR(expensePaise)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-ledger-inkSubtle">
              <TrendingDown className="w-3 h-3 text-ledger-inkMuted" />
              <span>Living costs, debits & utility expenses</span>
            </div>
          </div>
        </div>

        {/* PANEL 3: Allocation Capacity & Buffer (3 cols) */}
        <div className="lg:col-span-3 p-5 sm:p-6 bg-ledger-surfaceSubtle/40 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-ledger-inkSubtle font-medium block">
              Budget Capacity
            </span>
            <div className="text-[11px] text-ledger-inkMuted">
              Allocated Monthly Ceiling
            </div>
            <div className="font-serif text-xl sm:text-2xl font-bold text-ledger-ink tabular-nums">
              {formatINR(5500000)}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-ledger-borderSubtle">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-ledger-inkMuted">Remaining Buffer:</span>
              <span className="font-serif text-base font-bold text-ledger-teal tabular-nums">
                {formatINR(Math.max(0, 5500000 - expensePaise))}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-ledger-inkSubtle">
              <Clock className="w-3.5 h-3.5 text-ledger-teal" />
              <span>Pace: {formatINR(Math.round(5500000 / 30))}/day ceiling</span>
            </div>
            <p className="text-[11px] text-ledger-inkSubtle leading-relaxed">
              Calculated with integer paise precision under multi-tenant isolation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
