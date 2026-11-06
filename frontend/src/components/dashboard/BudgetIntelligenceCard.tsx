import React, { useState } from "react";
import { formatINR } from "../../lib/currency";
import type { BudgetPace } from "../../lib/api";
import { BarChart3, LineChart, Calendar } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"daily" | "cumulative">("daily");
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

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

  // Calculate cumulative spend series
  const series: Array<{ day: number; cumulativeSpendPaise: number; targetPacePaise: number; dailyPaise: number }> = [];
  let runningSpend = 0;
  let maxDailyPaise = Math.round((totalBudgetPaise / totalDays) * 2.5); // Baseline scale

  for (let day = 1; day <= totalDays; day++) {
    const daySpend = dailySpend[day] || 0;
    if (day <= currentDay) {
      runningSpend += daySpend;
      if (daySpend > maxDailyPaise) maxDailyPaise = daySpend;
    }
    const targetPace = Math.round((totalBudgetPaise / totalDays) * day);
    series.push({
      day,
      cumulativeSpendPaise: day <= currentDay ? runningSpend : runningSpend,
      targetPacePaise: targetPace,
      dailyPaise: daySpend,
    });
  }

  // Budget calculations
  const actualPoints = series.filter((s) => s.day <= currentDay);
  const currentActualSpend = actualPoints[actualPoints.length - 1]?.cumulativeSpendPaise || 0;
  const spentPaise = pace?.spent_paise ?? currentActualSpend;
  const remainingPaise = pace?.remaining_paise ?? Math.max(0, totalBudgetPaise - spentPaise);
  const utilization = pace?.utilization_percent ?? (totalBudgetPaise > 0 ? (spentPaise / totalBudgetPaise) * 100 : 0);
  const dailyTargetPacePaise = Math.round(totalBudgetPaise / Math.max(1, totalDays));

  // SVG Chart Layout
  const width = 680;
  const height = 210;
  const padding = { top: 20, right: 24, bottom: 28, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scaling for Cumulative
  const maxCumulativeVal = Math.max(totalBudgetPaise, currentActualSpend, 1000000) * 1.15;
  const getX = (day: number) => padding.left + ((day - 1) / Math.max(1, totalDays - 1)) * chartWidth;
  const getCumulativeY = (paise: number) => padding.top + chartHeight - (paise / maxCumulativeVal) * chartHeight;

  // Cumulative Paths
  let spendPath = "";
  let areaPath = "";
  if (actualPoints.length > 0) {
    spendPath = actualPoints.reduce((acc, pt, idx) => {
      const x = getX(pt.day);
      const y = getCumulativeY(pt.cumulativeSpendPaise);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");

    const firstX = getX(actualPoints[0].day);
    const lastX = getX(actualPoints[actualPoints.length - 1].day);
    const zeroY = getCumulativeY(0);
    areaPath = `${spendPath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  }

  // Scaling for Daily Bar Chart
  const maxDailyVal = Math.max(maxDailyPaise * 1.2, dailyTargetPacePaise * 1.5, 100000);
  const getDailyY = (paise: number) => padding.top + chartHeight - (paise / maxDailyVal) * chartHeight;
  const barWidth = Math.max(4, Math.floor(chartWidth / totalDays) - 3);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 min-w-0 overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4 min-w-0">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Activity & Pacing
          </span>
          <h3 className="font-sans text-lg sm:text-xl font-bold text-slate-900">
            Daily Spending Activity
          </h3>
        </div>

        {/* View Mode Toggle & Legend */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("daily")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "daily"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Daily Bars</span>
            </button>
            <button
              onClick={() => setViewMode("cumulative")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "cumulative"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Cumulative Pace</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Telemetry Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 min-w-0">
        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-semibold text-slate-500 uppercase block truncate">Monthly Budget</span>
          <div className="font-sans text-base sm:text-lg font-bold text-slate-900 tabular-nums truncate">
            {formatINR(totalBudgetPaise)}
          </div>
          <span className="text-[11px] text-slate-500 block truncate">Allocated limit</span>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-semibold text-slate-500 uppercase block truncate">Month Spend</span>
          <div className="font-sans text-base sm:text-lg font-bold text-slate-900 tabular-nums truncate">
            {formatINR(spentPaise)}
          </div>
          <span className="text-[11px] text-slate-500 block truncate">{utilization.toFixed(1)}% consumed</span>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-semibold text-slate-500 uppercase block truncate">Remaining Buffer</span>
          <div className="font-sans text-base sm:text-lg font-bold text-teal-700 tabular-nums truncate">
            {formatINR(remainingPaise)}
          </div>
          <span className="text-[11px] text-slate-500 block truncate">Unspent cushion</span>
        </div>

        <div className="space-y-0.5 min-w-0">
          <span className="text-xs font-semibold text-slate-500 uppercase block truncate">Timeline</span>
          <div className="font-sans text-base sm:text-lg font-bold text-slate-900 tabular-nums truncate">
            Day {currentDay} of {totalDays}
          </div>
          <span className="text-[11px] text-slate-500 capitalize block truncate">
            {pace?.status?.replace("_", " ") || "Calculating"}
          </span>
        </div>
      </div>

      {/* Interactive Chart Canvas */}
      <div className="relative w-full h-[190px] sm:h-[220px] select-none overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          <defs>
            <linearGradient id="activeBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="todayBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" />
              <stop offset="100%" stopColor="#14B8A6" />
            </linearGradient>
            <linearGradient id="cumulativeAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct) => {
            const y = padding.top + chartHeight * (1 - pct);
            const labelVal = viewMode === "daily" ? maxDailyVal * pct : maxCumulativeVal * pct;
            return (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {formatINR(Math.round(labelVal), { showPaise: false })}
                </text>
              </g>
            );
          })}

          {/* VIEW MODE 1: DAILY BARS */}
          {viewMode === "daily" && (
            <>
              {/* Daily Target Pace Ceiling Reference Line */}
              <line
                x1={padding.left}
                y1={getDailyY(dailyTargetPacePaise)}
                x2={width - padding.right}
                y2={getDailyY(dailyTargetPacePaise)}
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Day Bars */}
              {series.map((s) => {
                const x = padding.left + ((s.day - 1) / totalDays) * chartWidth + 2;
                const isPast = s.day < currentDay;
                const isToday = s.day === currentDay;
                const isFuture = s.day > currentDay;
                const hasSpend = s.dailyPaise > 0;
                const barH = hasSpend ? Math.max(4, chartHeight - (getDailyY(s.dailyPaise) - padding.top)) : 2;
                const barY = padding.top + chartHeight - barH;

                return (
                  <g
                    key={s.day}
                    onMouseEnter={() => setHoveredDay(s.day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="cursor-pointer transition-opacity"
                  >
                    {/* Bar background hover capture */}
                    <rect
                      x={x - 2}
                      y={padding.top}
                      width={barWidth + 4}
                      height={chartHeight}
                      fill="transparent"
                    />

                    {/* Bar geometry */}
                    <rect
                      x={x}
                      y={barY}
                      width={barWidth}
                      height={barH}
                      rx={isToday || isPast ? 3 : 1}
                      fill={
                        isToday
                          ? "url(#todayBarGradient)"
                          : hasSpend
                          ? "url(#activeBarGradient)"
                          : isFuture
                          ? "#E2E8F0"
                          : "#CBD5E1"
                      }
                      opacity={hoveredDay && hoveredDay !== s.day ? 0.4 : 1}
                    />

                    {/* Today marker dot */}
                    {isToday && (
                      <circle
                        cx={x + barWidth / 2}
                        cy={padding.top + chartHeight + 14}
                        r="2.5"
                        fill="#0F766E"
                      />
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* VIEW MODE 2: CUMULATIVE PACE */}
          {viewMode === "cumulative" && (
            <>
              {/* Scheduled Pace Linear Trajectory (Dashed) */}
              <line
                x1={getX(1)}
                y1={getCumulativeY(series[0]?.targetPacePaise || 0)}
                x2={getX(totalDays)}
                y2={getCumulativeY(totalBudgetPaise)}
                stroke="#94A3B8"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Actual Cumulative Area Wash */}
              {areaPath && <path d={areaPath} fill="url(#cumulativeAreaGradient)" />}

              {/* Actual Cumulative Line */}
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

              {/* Current Day Marker Circle */}
              {actualPoints.length > 0 && (
                <circle
                  cx={getX(currentDay)}
                  cy={getCumulativeY(currentActualSpend)}
                  r="5"
                  fill="#0F766E"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              )}
            </>
          )}

          {/* X Axis Day Labels */}
          {[1, 5, 10, 15, 20, 25, totalDays].map((dayNum) => (
            <text
              key={dayNum}
              x={getX(dayNum)}
              y={height - 8}
              textAnchor="middle"
              className="text-[9px] fill-slate-400 font-mono"
            >
              Day {dayNum}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredDay && viewMode === "daily" && (
          <div
            className="absolute top-2 right-4 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-md text-xs pointer-events-none transition-all flex items-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <span>Day {hoveredDay}:</span>
            <span className="font-bold text-teal-300">
              {formatINR(dailySpend[hoveredDay] || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Progress Track: Timeline vs Budget Utilization */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">Month Timeline:</span>
            <span>Day {currentDay} of {totalDays} ({Math.round((currentDay / totalDays) * 100)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">Budget Spent:</span>
            <span className={utilization > 100 ? "text-rose-600 font-semibold" : "text-slate-800"}>
              {utilization.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          {/* Target Timeline Marker */}
          <div
            className="absolute top-0 bottom-0 bg-slate-300 w-1 z-10"
            style={{ left: `${Math.min(100, (currentDay / totalDays) * 100)}%` }}
            title={`Day ${currentDay} Timeline Position`}
          />
          {/* Actual Spend Fill */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              utilization > 100
                ? "bg-rose-500"
                : utilization > (currentDay / totalDays) * 100 + 15
                ? "bg-amber-500"
                : "bg-teal-600"
            }`}
            style={{ width: `${Math.min(100, utilization)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Target pace: {formatINR(dailyTargetPacePaise)}/day</span>
          <span>
            {utilization > (currentDay / totalDays) * 100
              ? `Running ${(utilization - (currentDay / totalDays) * 100).toFixed(1)}% ahead of calendar schedule`
              : "Spending within calendar pace"}
          </span>
        </div>
      </div>
    </div>
  );
};
