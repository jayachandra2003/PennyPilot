import React from "react";
import type { CategoryBreakdownItem } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { PieChart, Utensils, ShoppingBag, Home, Zap, Film, HeartPulse, HelpCircle } from "lucide-react";

interface CategoryBreakdownCardProps {
  categories: CategoryBreakdownItem[];
  totalExpensePaise?: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  dining: Utensils,
  food: Utensils,
  groceries: ShoppingBag,
  housing: Home,
  rent: Home,
  utilities: Zap,
  entertainment: Film,
  movies: Film,
  healthcare: HeartPulse,
  health: HeartPulse,
};

const CATEGORY_COLORS = [
  "bg-teal-600",
  "bg-slate-800",
  "bg-indigo-600",
  "bg-amber-500",
  "bg-emerald-600",
  "bg-rose-500",
];

export const CategoryBreakdownCard: React.FC<CategoryBreakdownCardProps> = ({
  categories,
  totalExpensePaise,
}) => {
  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
      if (lower.includes(key)) return Icon;
    }
    return HelpCircle;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4 min-w-0">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Spending Breakdown
          </span>
          <h3 className="font-sans text-lg sm:text-xl font-bold text-slate-900">
            Category Spending
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <PieChart className="w-3.5 h-3.5 text-slate-500" />
          <span>{totalExpensePaise ? formatINR(totalExpensePaise) : "Ranked"}</span>
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No expense transactions recorded for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.slice(0, 6).map((cat, idx) => {
            const Icon = getCategoryIcon(cat.category_name);
            const colorClass = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

            return (
              <div key={cat.category_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-slate-800 truncate">{cat.category_name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({cat.transaction_count} txs)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-bold text-slate-900">{cat.formatted_total}</span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 w-11 text-center">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Proportional Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
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
