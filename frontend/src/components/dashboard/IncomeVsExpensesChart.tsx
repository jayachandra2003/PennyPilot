import React, { useState } from "react";
import type { MonthlySummary } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { BarChart3 } from "lucide-react";

interface IncomeVsExpensesChartProps {
  period: "monthly" | "yearly";
  summary?: MonthlySummary;
}

export const IncomeVsExpensesChart: React.FC<IncomeVsExpensesChartProps> = ({
  period,
  summary,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const trajectory = summary?.monthly_trajectory || [];
  const incomePaise = summary?.income_paise || 0;
  const expensePaise = summary?.expense_paise || 0;

  // Find max value to scale chart
  const maxValue = Math.max(
    ...trajectory.map((m) => Math.max(m.income_paise, m.expense_paise)),
    incomePaise,
    expensePaise,
    100000 // minimum scale ₹1,000 to avoid div by zero
  );

  const chartHeight = 160;

  return (
    <div className="glass-panel p-5 sm:p-6 space-y-4 rounded-2xl flex flex-col justify-between">
      {/* Header with Legends */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ledger-borderSubtle pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-ledger-teal" />
          <h3 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
            Income vs Expenses
          </h3>
          <span className="text-xs font-mono text-ledger-inkSubtle">
            ({period === "yearly" ? "Full Calendar Year" : "Monthly Comparison"})
          </span>
        </div>

        {/* Chart Legends */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="text-ledger-ink">Inflow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
            <span className="text-ledger-ink">Outflow</span>
          </div>
        </div>
      </div>

      {/* Main Chart Body */}
      {period === "yearly" ? (
        <div className="space-y-2">
          {/* SVG Multi-Month Dual Bar Chart */}
          <div className="relative pt-6">
            <div className="flex items-end justify-between gap-1 sm:gap-2 h-44 px-1">
              {trajectory.map((m, idx) => {
                const incHeight = Math.max(4, Math.round((m.income_paise / maxValue) * chartHeight));
                const expHeight = Math.max(4, Math.round((m.expense_paise / maxValue) * chartHeight));
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={m.month}
                    className="flex-1 flex flex-col items-center gap-1 group cursor-pointer relative"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-30 p-2.5 rounded-xl bg-slate-900/95 dark:bg-[#121D28]/95 border border-white/15 text-[11px] shadow-xl pointer-events-none whitespace-nowrap min-w-[130px] font-mono">
                        <div className="font-bold text-slate-100 border-b border-white/10 pb-1 mb-1">
                          {m.month_name} 2026
                        </div>
                        <div className="text-emerald-400 flex justify-between">
                          <span>Inflow:</span>
                          <span className="font-semibold">{m.income_formatted}</span>
                        </div>
                        <div className="text-rose-400 flex justify-between">
                          <span>Outflow:</span>
                          <span className="font-semibold">{m.expense_formatted}</span>
                        </div>
                        <div className="text-slate-300 flex justify-between pt-1 border-t border-white/10 mt-1">
                          <span>Savings:</span>
                          <span className="font-semibold">{m.net_balance_formatted}</span>
                        </div>
                      </div>
                    )}

                    {/* Bars Container */}
                    <div className="flex items-end gap-1 w-full justify-center h-40">
                      {/* Income Bar */}
                      <div
                        className={`w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300 ${
                          isHovered ? "brightness-125 shadow-[0_0_10px_rgba(52,211,153,0.6)]" : "opacity-90"
                        }`}
                        style={{ height: `${incHeight}px` }}
                        title={`${m.month_name} Inflow: ${m.income_formatted}`}
                      />
                      {/* Expense Bar */}
                      <div
                        className={`w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-300 ${
                          isHovered ? "brightness-125 shadow-[0_0_10px_rgba(248,113,113,0.6)]" : "opacity-90"
                        }`}
                        style={{ height: `${expHeight}px` }}
                        title={`${m.month_name} Outflow: ${m.expense_formatted}`}
                      />
                    </div>

                    {/* Month Label */}
                    <span className="text-[10px] sm:text-xs font-mono text-ledger-inkSubtle group-hover:text-ledger-ink font-semibold">
                      {m.month_name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Monthly Comparison Dual Channel View */
        <div className="space-y-5 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Inflow Bar */}
            <div className="p-4 rounded-xl border border-ledger-borderSubtle bg-ledger-surfaceSubtle/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ledger-inkSubtle font-medium">Monthly Inflow</span>
                <span className="font-serif font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                  {formatINR(incomePaise)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                  style={{ width: `${incomePaise > 0 ? "100%" : "0%"}` }}
                />
              </div>
              <span className="text-[10px] text-ledger-inkSubtle font-mono">
                {incomePaise > 0 ? "Active monthly inflow verified" : "No inflow recorded"}
              </span>
            </div>

            {/* Monthly Outflow Bar */}
            <div className="p-4 rounded-xl border border-ledger-borderSubtle bg-ledger-surfaceSubtle/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ledger-inkSubtle font-medium">Monthly Outflow</span>
                <span className="font-serif font-bold text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                  {formatINR(expensePaise)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(248,113,113,0.4)]"
                  style={{
                    width: `${
                      incomePaise > 0
                        ? `${Math.min(100, Math.round((expensePaise / incomePaise) * 100))}%`
                        : expensePaise > 0
                        ? "100%"
                        : "0%"
                    }`,
                  }}
                />
              </div>
              <span className="text-[10px] text-ledger-inkSubtle font-mono">
                {incomePaise > 0
                  ? `${((expensePaise / incomePaise) * 100).toFixed(1)}% of verified monthly inflow`
                  : "Outflow ratio based on recorded expenses"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Total Telemetry */}
      <div className="flex items-center justify-between pt-3 border-t border-ledger-borderSubtle text-xs font-mono">
        <span className="text-ledger-inkSubtle">
          Net Capital Retention:{" "}
          <span
            className={`font-bold ${
              incomePaise >= expensePaise ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
            }`}
          >
            {formatINR(incomePaise - expensePaise)}
          </span>
        </span>
        <span className="text-ledger-inkSubtle">
          Savings Rate:{" "}
          <span className="font-bold text-ledger-ink">
            {summary?.savings_rate_percent ? `${summary.savings_rate_percent.toFixed(1)}%` : "0.0%"}
          </span>
        </span>
      </div>
    </div>
  );
};
