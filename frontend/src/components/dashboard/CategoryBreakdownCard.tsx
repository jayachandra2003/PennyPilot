import React from "react";
import type { CategoryBreakdownItem } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { CategoryGlassIcon } from "../common/GlassIcon";

interface CategoryBreakdownCardProps {
  categories: CategoryBreakdownItem[];
  totalExpensePaise?: number;
}

const CATEGORY_COLORS = [
  "bg-ledger-teal",
  "bg-[#334155]", // Slate 700
  "bg-[#4F46E5]", // Indigo 600
  "bg-ledger-amber",
  "bg-ledger-sage",
  "bg-ledger-red",
];

export const CategoryBreakdownCard: React.FC<CategoryBreakdownCardProps> = ({
  categories,
  totalExpensePaise,
}) => {
  return (
    <div className="glass-panel p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden rounded-2xl h-full flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3 sm:pb-4 min-w-0">
        <div>
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
            Allocation Distribution
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
            Category Spending
          </h2>
        </div>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-medium bg-ledger-surfaceSubtle/80 backdrop-blur-md text-ledger-ink border border-ledger-borderSubtle">
          <span>Total: {totalExpensePaise ? formatINR(totalExpensePaise) : "Ranked"}</span>
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-10 text-xs text-ledger-inkMuted bg-ledger-surfaceSubtle/50 rounded-xl border border-dashed border-ledger-border">
          No expense transactions recorded for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Multi-Segment Composite Distribution Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-ledger-surfaceSubtle/60 backdrop-blur-md rounded-full overflow-hidden flex border border-ledger-borderSubtle/60 shadow-inner">
              {categories.slice(0, 6).map((cat, idx) => (
                <div
                  key={cat.category_id}
                  className={`h-full ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} transition-all`}
                  style={{ width: `${Math.max(2, cat.percentage)}%` }}
                  title={`${cat.category_name}: ${cat.percentage}% (${cat.formatted_total})`}
                />
              ))}
            </div>
          </div>

          {/* Structured Category List */}
          <div className="space-y-3 pt-1">
            {categories.slice(0, 6).map((cat, idx) => {
              const colorClass = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

              return (
                <div key={cat.category_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryGlassIcon iconName={cat.category_name} size="xs" />
                      <span className="font-semibold text-ledger-ink truncate">{cat.category_name}</span>
                      <span className="text-[11px] font-mono text-ledger-inkSubtle shrink-0">
                        ({cat.transaction_count} {cat.transaction_count === 1 ? "tx" : "txs"})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="font-serif font-bold text-ledger-ink">{cat.formatted_total}</span>
                      <span className="font-mono text-[11px] text-ledger-inkMuted w-12 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Individual proportional bar */}
                  <div className="w-full bg-slate-200/50 dark:bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/20 dark:border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                      style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
