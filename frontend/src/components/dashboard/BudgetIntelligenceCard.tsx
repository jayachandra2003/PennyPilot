import React from "react";
import { formatINR } from "../../lib/currency";
import type { BudgetPace } from "../../lib/api";

interface DataPoint {
  day: number;
  dateStr: string;
  cumulativeSpendPaise: number;
  targetPacePaise: number;
}

interface BudgetIntelligenceCardProps {
  totalBudgetPaise: number;
  totalDays: number;
  currentDay: number;
  pace?: BudgetPace;
  transactions: Array<{
    amount_paise: number;
    occurred_on: string;
    kind: string;
  }>;
}

export const BudgetIntelligenceCard: React.FC<BudgetIntelligenceCardProps> = ({
  totalBudgetPaise: totalBudgetProp,
  totalDays: totalDaysProp,
  currentDay: currentDayProp,
  pace,
  transactions,
}) => {
  const totalDays = pace?.total_days ?? totalDaysProp;
  const currentDay = pace?.elapsed_days ?? currentDayProp;
  const totalBudgetPaise = pace?.limit_paise ?? totalBudgetProp;

  // Aggregate daily expenses from Day 1 to totalDays
  const dailySpend: Record<number, number> = {};
  for (const t of transactions) {
    if (t.kind === "expense") {
      const parts = t.occurred_on.split("-");
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        dailySpend[d] = (dailySpend[d] || 0) + t.amount_paise;
      }
    }
  }

  const series: DataPoint[] = [];
  let runningSpend = 0;
  for (let day = 1; day <= totalDays; day++) {
    if (day <= currentDay) {
      runningSpend += dailySpend[day] || 0;
    }
    const targetPace = Math.round((totalBudgetPaise / totalDays) * day);
    series.push({
      day,
      dateStr: `Day ${day}`,
      cumulativeSpendPaise: day <= currentDay ? runningSpend : runningSpend,
      targetPacePaise: targetPace,
    });
  }

  // Chart layout dimensions
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 24, bottom: 28, left: 64 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const actualPoints = series.filter((s) => s.day <= currentDay);
  const currentActualSpend = actualPoints[actualPoints.length - 1]?.cumulativeSpendPaise || 0;

  // Scale Y to maximum of totalBudget, highest spend, or min baseline
  const maxVal = Math.max(
    totalBudgetPaise,
    currentActualSpend,
    1000000
  ) * 1.15;

  const getX = (day: number) => padding.left + ((day - 1) / Math.max(1, totalDays - 1)) * chartWidth;
  const getY = (paise: number) => padding.top + chartHeight - (paise / maxVal) * chartHeight;

  // Actual Spend Curve SVG path
  let spendPath = "";
  let areaPath = "";
  if (actualPoints.length > 0) {
    spendPath = actualPoints.reduce((acc, pt, idx) => {
      const x = getX(pt.day);
      const y = getY(pt.cumulativeSpendPaise);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");

    const firstX = getX(actualPoints[0].day);
    const lastX = getX(actualPoints[actualPoints.length - 1].day);
    const zeroY = getY(0);
    areaPath = `${spendPath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  }

  // Budget calculations
  const spentPaise = pace?.spent_paise ?? currentActualSpend;
  const remainingPaise = pace?.remaining_paise ?? Math.max(0, totalBudgetPaise - spentPaise);
  const utilization = pace?.utilization_percent ?? (totalBudgetPaise > 0 ? (spentPaise / totalBudgetPaise) * 100 : 0);

  return (
    <div className="card-base p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 min-w-0 overflow-hidden">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-ledger-borderSubtle pb-3 sm:pb-4 min-w-0">
        <div>
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Budget Intelligence
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
            Spending Pace & Allocation Limits
          </h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-ledger-teal rounded-full" />
            <span className="font-medium text-ledger-ink">Actual Spend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-ledger-inkSubtle" />
            <span className="text-ledger-inkMuted">Scheduled Pace</span>
          </div>
        </div>
      </div>

      {/* 4 Budget Metrics Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 bg-ledger-surfaceSubtle border border-ledger-borderSubtle rounded-md p-2.5 sm:p-3.5 min-w-0">
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase text-ledger-inkSubtle block truncate">Budget Limit</span>
          <div className="font-serif text-sm sm:text-base md:text-lg font-bold text-ledger-ink tabular-nums truncate">
            {formatINR(totalBudgetPaise)}
          </div>
          <span className="text-[10px] text-ledger-inkSubtle block truncate">8 active categories</span>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase text-ledger-inkSubtle block truncate">Amount Spent</span>
          <div className="font-serif text-sm sm:text-base md:text-lg font-bold text-ledger-ink tabular-nums truncate">
            {formatINR(spentPaise)}
          </div>
          <span className="text-[10px] text-ledger-inkSubtle block truncate">{utilization.toFixed(1)}% of limit</span>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase text-ledger-inkSubtle block truncate">Remaining</span>
          <div className="font-serif text-sm sm:text-base md:text-lg font-bold text-ledger-teal tabular-nums truncate">
            {formatINR(remainingPaise)}
          </div>
          <span className="text-[10px] text-ledger-inkSubtle block truncate">Available buffer</span>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase text-ledger-inkSubtle block truncate">Spending Pace</span>
          <div className="font-serif text-sm sm:text-base md:text-lg font-bold text-ledger-ink tabular-nums truncate">
            Day {currentDay} of {totalDays}
          </div>
          <span className="text-[10px] text-ledger-inkSubtle capitalize block truncate">
            Status: {pace?.status?.replace("_", " ") || "Calculating"}
          </span>
        </div>
      </div>

      {/* SVG Budget Pace Chart (Vertically efficient & strictly contained) */}
      <div className="relative w-full h-[180px] sm:h-[210px] md:h-[230px] overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
        >
          <defs>
            <linearGradient id="budgetAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const yVal = maxVal * pct;
            const y = getY(yVal);
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#EFECE6"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-ledger-inkSubtle font-mono"
                >
                  {formatINR(Math.round(yVal), { showPaise: false })}
                </text>
              </g>
            );
          })}

          {/* Linear Scheduled Pace Line (Dashed) */}
          <line
            x1={getX(1)}
            y1={getY(series[0]?.targetPacePaise || 0)}
            x2={getX(totalDays)}
            y2={getY(totalBudgetPaise)}
            stroke="#7D848F"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Actual Spend Area Wash */}
          {areaPath && (
            <path d={areaPath} fill="url(#budgetAreaGradient)" />
          )}

          {/* Actual Spend Line */}
          {spendPath && (
            <path
              d={spendPath}
              fill="none"
              stroke="#0F766E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current Day Point Marker */}
          {actualPoints.length > 0 && (
            <g>
              <circle
                cx={getX(currentDay)}
                cy={getY(currentActualSpend)}
                r="4.5"
                fill="#0F766E"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Labels */}
          {[1, 5, 10, 15, 20, 25, totalDays].map((dayNum) => (
            <text
              key={dayNum}
              x={getX(dayNum)}
              y={height - 8}
              textAnchor="middle"
              className="text-[9px] fill-ledger-inkSubtle font-mono"
            >
              Day {dayNum}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};
