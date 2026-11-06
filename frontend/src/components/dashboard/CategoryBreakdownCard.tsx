import React from "react";
import type { CategoryBreakdownItem } from "../../lib/api";
import { formatINR } from "../../lib/currency";

interface CategoryBreakdownCardProps {
  categories: CategoryBreakdownItem[];
  totalExpensePaise?: number;
}

export const CategoryBreakdownCard: React.FC<CategoryBreakdownCardProps> = ({
  categories,
  totalExpensePaise,
}) => {
  return (
    <div className="card-base p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3">
        <div>
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Spending Analysis
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
            Category Breakdown
          </h3>
        </div>
        <span className="text-xs font-mono text-ledger-inkSubtle">
          {totalExpensePaise
            ? `Total: ${formatINR(totalExpensePaise)}`
            : "Ranked by spend"}
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-10 text-xs text-ledger-inkMuted bg-ledger-surfaceSubtle rounded-md border border-dashed border-ledger-border">
          No expense transactions recorded for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.slice(0, 6).map((cat, idx) => {
            const isHighest = idx === 0;
            return (
              <div key={cat.category_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ledger-ink">{cat.category_name}</span>
                    <span className="text-[11px] font-mono text-ledger-inkSubtle">
                      ({cat.transaction_count} txs)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums font-mono">
                    <span className="font-semibold text-ledger-ink">{cat.formatted_total}</span>
                    <span className="text-ledger-inkMuted text-[11px] w-12 text-right">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Clean proportional bar */}
                <div className="w-full bg-ledger-surfaceSubtle h-2 rounded-full overflow-hidden border border-ledger-borderSubtle">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHighest ? "bg-ledger-teal" : "bg-ledger-teal/70"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
