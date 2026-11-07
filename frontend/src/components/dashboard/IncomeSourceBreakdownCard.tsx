import React from "react";
import { DollarSign, SlidersHorizontal, Plus, Briefcase, Laptop, Landmark, Sparkles } from "lucide-react";
import { formatINR } from "../../lib/currency";
import type { MonthlyIncomeOverview } from "../../lib/api";

interface IncomeSourceBreakdownCardProps {
  incomeOverview?: MonthlyIncomeOverview;
  period: "monthly" | "yearly";
  onManageIncome?: () => void;
}

const getSourceIcon = (source: string) => {
  const s = source.toLowerCase();
  if (s.includes("salary") || s.includes("job")) return Briefcase;
  if (s.includes("freelance") || s.includes("consulting")) return Laptop;
  if (s.includes("invest") || s.includes("dividend") || s.includes("interest")) return Landmark;
  return DollarSign;
};

export const IncomeSourceBreakdownCard: React.FC<IncomeSourceBreakdownCardProps> = ({
  incomeOverview,
  period,
  onManageIncome,
}) => {
  const sources = incomeOverview?.sources_breakdown || [];
  const totalIncomePaise = incomeOverview?.total_income_paise || 0;

  return (
    <div className="glass-panel p-5 sm:p-6 space-y-4 rounded-2xl h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h3 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
            Income Streams
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-ledger-inkSubtle">
            {sources.length} {sources.length === 1 ? "stream" : "streams"}
          </span>
          {onManageIncome && (
            <button
              type="button"
              onClick={onManageIncome}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer focus-ring select-none min-h-[32px]"
              title="Manage income streams"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Manage</span>
            </button>
          )}
        </div>
      </div>

      {sources.length === 0 || totalIncomePaise === 0 ? (
        <div className="py-8 text-center space-y-3 bg-ledger-surfaceSubtle/30 rounded-xl border border-dashed border-ledger-border">
          <Sparkles className="w-8 h-8 text-emerald-500/50 mx-auto" />
          <div>
            <p className="text-xs font-medium text-ledger-ink">No income streams configured</p>
            <p className="text-[11px] text-ledger-inkSubtle max-w-xs mx-auto mt-0.5">
              Add your salary, freelance, or other earnings to monitor cash flow and savings capacity.
            </p>
          </div>
          {onManageIncome && (
            <button
              type="button"
              onClick={onManageIncome}
              className="btn-primary text-xs px-3.5 py-1.5 min-h-[36px] inline-flex items-center gap-1.5 focus-ring cursor-pointer select-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set Up Inflow</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((item) => {
            const Icon = getSourceIcon(item.source);
            return (
              <div
                key={item.source}
                className="p-3 rounded-xl bg-ledger-surfaceSubtle/40 border border-ledger-borderSubtle space-y-2 transition-all hover:bg-ledger-surfaceSubtle/70"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-ledger-ink capitalize truncate">
                      {item.source}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle font-mono">
                      ({item.count} {item.count === 1 ? "entry" : "entries"})
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {item.total_formatted}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle font-mono block">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}

          {period === "yearly" && incomeOverview?.projected_recurring_annual_paise && (
            <div className="text-[11px] font-mono text-ledger-inkSubtle text-right pt-1">
              Projected recurring annual income: {formatINR(incomeOverview.projected_recurring_annual_paise)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
