import React, { useState } from "react";
import type { CategoryBreakdownItem } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { PieChart as PieChartIcon } from "lucide-react";

interface ExpenseDonutChartProps {
  categories: CategoryBreakdownItem[];
  totalExpensePaise: number;
}

const DONUT_COLORS = [
  "#2DD4BF", // Teal
  "#38BDF8", // Sky
  "#818CF8", // Indigo
  "#F472B6", // Pink
  "#FBBF24", // Amber
  "#34D399", // Emerald
  "#A78BFA", // Purple
  "#FB7185", // Rose
];

export const ExpenseDonutChart: React.FC<ExpenseDonutChartProps> = ({
  categories,
  totalExpensePaise,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 68;
  const strokeWidth = 22;
  const center = 90;
  const circumference = 2 * Math.PI * radius;

  // Compute segments
  let accumulatedPercent = 0;
  const slices = categories.slice(0, 6).map((cat, idx) => {
    const pct = Math.max(0, cat.percentage);
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += pct;
    return {
      ...cat,
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="glass-panel p-5 sm:p-6 space-y-4 rounded-2xl h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-ledger-teal" />
          <h3 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
            Expense Distribution
          </h3>
        </div>
        <span className="text-xs font-mono text-ledger-inkSubtle uppercase tracking-wider">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </span>
      </div>

      {categories.length === 0 || totalExpensePaise === 0 ? (
        <div className="py-12 text-center space-y-2 bg-ledger-surfaceSubtle/30 rounded-xl border border-dashed border-ledger-border">
          <PieChartIcon className="w-8 h-8 text-ledger-inkSubtle mx-auto opacity-50" />
          <p className="text-xs font-medium text-ledger-ink">No expense data</p>
          <p className="text-[11px] text-ledger-inkSubtle">
            Category breakdown will appear as you record outflows.
          </p>
        </div>
      ) : (
        /* Side-by-side horizontal layout: Donut SVG on Left, Legend on Right */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 pt-1">
          {/* Left: SVG Donut */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              className="transform -rotate-90"
              aria-label="Expense Distribution Donut Chart"
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-200/50 dark:text-white/5"
              />
              {slices.map((slice, idx) => (
                <circle
                  key={slice.category_id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={hoveredIndex === idx ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
                {activeItem ? activeItem.category_name : "TOTAL OUTFLOW"}
              </span>
              <span className="font-serif text-sm sm:text-base font-bold text-ledger-ink tabular-nums mt-0.5">
                {activeItem ? activeItem.formatted_total : formatINR(totalExpensePaise)}
              </span>
              {activeItem && (
                <span className="text-[10px] sm:text-[11px] font-mono text-ledger-teal font-semibold">
                  {activeItem.percentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Right: Slices Legend List */}
          <div className="flex-1 w-full space-y-1.5 min-w-0">
            {slices.map((slice, idx) => (
              <div
                key={slice.category_id}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center justify-between p-1.5 sm:p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                  hoveredIndex === idx
                    ? "bg-slate-200/50 dark:bg-white/10"
                    : "hover:bg-ledger-surfaceSubtle/60"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="font-medium text-ledger-ink truncate">
                    {slice.category_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 tabular-nums shrink-0">
                  <span className="font-serif font-bold text-ledger-ink">
                    {slice.formatted_total}
                  </span>
                  <span className="font-mono text-[10px] sm:text-[11px] text-ledger-inkSubtle w-11 text-right">
                    {slice.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
