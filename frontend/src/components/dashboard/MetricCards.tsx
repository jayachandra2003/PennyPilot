import React from "react";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Monthly Income */}
      <div className="card-base p-5 flex flex-col justify-between transition-all hover:border-ledger-borderDark">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Monthly Income
          </span>
          <div className="w-7 h-7 rounded-md bg-ledger-sageLight text-ledger-sage flex items-center justify-center border border-ledger-sage/20 shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1 my-2">
          <div className="font-serif text-2xl sm:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums">
            {formatINR(incomePaise)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-ledger-inkSubtle">
            <span className="inline-flex items-center text-ledger-sage font-medium">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              <span>Inflow</span>
            </span>
            <span>•</span>
            <span>Salary & deposits</span>
          </div>
        </div>
      </div>

      {/* 2. Monthly Expenses */}
      <div className="card-base p-5 flex flex-col justify-between transition-all hover:border-ledger-borderDark">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Monthly Expenses
          </span>
          <div className="w-7 h-7 rounded-md bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center border border-ledger-border shrink-0">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1 my-2">
          <div className="font-serif text-2xl sm:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums">
            {formatINR(expensePaise)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-ledger-inkSubtle">
            <span className="inline-flex items-center text-ledger-inkMuted font-medium">
              <TrendingDown className="w-3 h-3 mr-0.5" />
              <span>Outflow</span>
            </span>
            <span>•</span>
            <span>{transactionCount} transactions</span>
          </div>
        </div>
      </div>

      {/* 3. Net Cash Flow */}
      <div className="card-base p-5 flex flex-col justify-between transition-all hover:border-ledger-borderDark">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Net Cash Flow
          </span>
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center border shrink-0 ${
              isNetPositive
                ? "bg-ledger-tealLight text-ledger-teal border-ledger-teal/20"
                : "bg-ledger-redLight text-ledger-red border-ledger-red/20"
            }`}
          >
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1 my-2">
          <div
            className={`font-serif text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${
              isNetPositive ? "text-ledger-teal" : "text-ledger-red"
            }`}
          >
            {formatINR(netBalancePaise)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-ledger-inkSubtle">
            <span
              className={`font-medium ${
                isNetPositive ? "text-ledger-teal" : "text-ledger-red"
              }`}
            >
              {isNetPositive ? "Net Positive" : "Deficit"}
            </span>
            <span>•</span>
            <span>Retained surplus</span>
          </div>
        </div>
      </div>

      {/* 4. Savings Rate */}
      <div className="card-base p-5 flex flex-col justify-between transition-all hover:border-ledger-borderDark">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Savings Rate
          </span>
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center border shrink-0 ${
              isDisciplinedSavings
                ? "bg-ledger-sageLight text-ledger-sage border-ledger-sage/20"
                : "bg-ledger-amberLight text-ledger-amber border-ledger-amber/20"
            }`}
          >
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1 my-2">
          <div className="font-serif text-2xl sm:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums">
            {savingsRate.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-ledger-inkSubtle">
            <span
              className={`font-medium ${
                isDisciplinedSavings ? "text-ledger-sage" : "text-ledger-amber"
              }`}
            >
              {isDisciplinedSavings ? "Disciplined" : "Below Baseline"}
            </span>
            <span>•</span>
            <span>Target: &gt; 25%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
