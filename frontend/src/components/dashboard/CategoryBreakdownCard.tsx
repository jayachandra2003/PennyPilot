import React from "react";
import type { CategoryBreakdownItem } from "../../lib/api";

interface CategoryBreakdownCardProps {
  categories: CategoryBreakdownItem[];
  totalExpensePaise?: number;
}

export const CategoryBreakdownCard: React.FC<CategoryBreakdownCardProps> = ({
  categories,
  totalExpensePaise,
}) => {
  return (
    <div className="bg-ledger-surface p-5 md:p-6 rounded-2xl border border-ledger-border shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-ledger-border pb-3">
        <div>
          <span className="text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider">
            Spending Distribution
          </span>
          <h3 className="font-serif text-lg font-bold text-ledger-ink">
            Category Breakdown
          </h3>
        </div>
        <span className="text-xs text-ledger-inkSubtle">
          {totalExpensePaise ? `Total: ₹${(totalExpensePaise / 100).toLocaleString("en-IN")}` : "Sorted by highest spend"}
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-xs text-ledger-inkMuted">
          No expense transactions recorded for this month.
        </div>
      ) : (
        <div className="space-y-3.5">
          {categories.slice(0, 6).map((cat) => {
            const isDominant = cat.percentage >= 30;
            return (
              <div key={cat.category_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ledger-ink">{cat.category_name}</span>
                    <span className="text-[11px] text-ledger-inkSubtle">({cat.transaction_count} txs)</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-bold text-ledger-ink">{cat.formatted_total}</span>
                    <span className="text-ledger-inkMuted w-12 text-right">{cat.percentage}%</span>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="w-full bg-ledger-borderSubtle h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDominant ? "bg-ledger-teal" : "bg-ledger-teal/70"
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
