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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
      {/* 1. Monthly Income */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Monthly Income
          </span>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5 my-2 min-w-0">
          <div className="font-sans text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums break-words">
            {formatINR(incomePaise)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <TrendingUp className="w-3 h-3 mr-1" />
              Inflow
            </span>
            <span className="truncate">Salary & deposits</span>
          </div>
        </div>
      </div>

      {/* 2. Monthly Expenses */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Monthly Expenses
          </span>
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5 my-2 min-w-0">
          <div className="font-sans text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums break-words">
            {formatINR(expensePaise)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <TrendingDown className="w-3 h-3 mr-1" />
              Outflow
            </span>
            <span className="truncate">{transactionCount} transactions</span>
          </div>
        </div>
      </div>

      {/* 3. Net Cash Flow */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Net Cash Flow
          </span>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
              isNetPositive
                ? "bg-teal-50 text-teal-700 border-teal-100"
                : "bg-rose-50 text-rose-600 border-rose-100"
            }`}
          >
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5 my-2 min-w-0">
          <div
            className={`font-sans text-2xl lg:text-3xl font-bold tracking-tight tabular-nums break-words ${
              isNetPositive ? "text-slate-900" : "text-rose-600"
            }`}
          >
            {formatINR(netBalancePaise)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                isNetPositive
                  ? "bg-teal-50 text-teal-700 border-teal-100"
                  : "bg-rose-50 text-rose-700 border-rose-100"
              }`}
            >
              {isNetPositive ? "+ Surplus" : "- Deficit"}
            </span>
            <span className="truncate">Retained balance</span>
          </div>
        </div>
      </div>

      {/* 4. Savings Rate */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Savings Rate
          </span>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
              isDisciplinedSavings
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-amber-50 text-amber-600 border-amber-100"
            }`}
          >
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1.5 my-2 min-w-0">
          <div className="font-sans text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight tabular-nums break-words">
            {savingsRate.toFixed(2)}%
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                isDisciplinedSavings
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}
            >
              {isDisciplinedSavings ? "Disciplined" : "Below 25% Target"}
            </span>
            <span className="truncate">Target: &gt; 25%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
