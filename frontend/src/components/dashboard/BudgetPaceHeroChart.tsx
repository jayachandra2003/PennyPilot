import React from "react";
import { formatINR } from "../../lib/currency";

interface DataPoint {
  day: number;
  dateStr: string;
  cumulativeSpendPaise: number;
  targetPacePaise: number;
}

interface BudgetPaceHeroChartProps {
  totalBudgetPaise: number;
  totalDays: number;
  currentDay: number;
  transactions: Array<{
    amount_paise: number;
    occurred_on: string;
    kind: string;
  }>;
}

export const BudgetPaceHeroChart: React.FC<BudgetPaceHeroChartProps> = ({
  totalBudgetPaise,
  totalDays,
  currentDay,
  transactions,
}) => {

  // Build daily data series from Day 1 to totalDays
  const dailySpend: Record<number, number> = {};
  for (const t of transactions) {
    if (t.kind === "expense") {
      const d = parseInt(t.occurred_on.split("-")[2], 10);
      dailySpend[d] = (dailySpend[d] || 0) + t.amount_paise;
    }
  }

  const series: DataPoint[] = [];
  let runningSpend = 0;
  for (let day = 1; day <= totalDays; day++) {
    if (day <= currentDay) {
      runningSpend += dailySpend[day] || 0;
    }
    const pace = Math.round((totalBudgetPaise / totalDays) * day);
    series.push({
      day,
      dateStr: `Day ${day}`,
      cumulativeSpendPaise: day <= currentDay ? runningSpend : runningSpend,
      targetPacePaise: pace,
    });
  }

  // Chart dimensions
  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Max Y value scaled to budget or max spend with 15% headroom
  const maxVal = Math.max(
    totalBudgetPaise,
    ...series.map((s) => (s.day <= currentDay ? s.cumulativeSpendPaise : 0)),
    1000000
  ) * 1.15;

  const getX = (day: number) => padding.left + ((day - 1) / (totalDays - 1)) * chartWidth;
  const getY = (paise: number) => padding.top + chartHeight - (paise / maxVal) * chartHeight;

  // Budget Pace Line Points (Dashed)
  const paceStart = { x: getX(1), y: getY(series[0].targetPacePaise) };
  const paceEnd = { x: getX(totalDays), y: getY(totalBudgetPaise) };

  // Actual Spend Curve (Up to currentDay)
  const actualPoints = series.filter((s) => s.day <= currentDay);
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

  const currentSpend = actualPoints[actualPoints.length - 1]?.cumulativeSpendPaise || 0;
  const currentPaceTarget = Math.round((totalBudgetPaise / totalDays) * currentDay);
  const isOverPace = currentSpend > currentPaceTarget;

  return (
    <div className="bg-ledger-surface p-5 md:p-6 rounded-2xl border border-ledger-border shadow-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ledger-border pb-3">
        <div>
          <span className="text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider">
            Signature Insight
          </span>
          <h3 className="font-serif text-lg font-bold text-ledger-ink">
            Cumulative Spend vs. Budget Pace
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-ledger-teal rounded-full" />
            <span className="font-medium text-ledger-ink">Actual Spend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-ledger-inkSubtle" />
            <span className="text-ledger-inkMuted">Scheduled Pace</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="relative w-full aspect-[25/10] min-h-[220px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible select-none"
        >
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.25" />
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
                  stroke="#E6E2D8"
                  strokeWidth="1"
                  strokeDasharray="2 3"
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

          {/* Budget Limit Reference Horizontal Line */}
          <line
            x1={padding.left}
            y1={getY(totalBudgetPaise)}
            x2={width - padding.right}
            y2={getY(totalBudgetPaise)}
            stroke="#D97706"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.8"
          />

          {/* Scheduled Pace Line */}
          <line
            x1={paceStart.x}
            y1={paceStart.y}
            x2={paceEnd.x}
            y2={paceEnd.y}
            stroke="#8C929B"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Actual Spend Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#spendGradient)" />}

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
                y={getY(currentSpend)}
                r="5"
                fill="#0F766E"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="animate-pulse"
              />
            </g>
          )}

          {/* X Axis Day Labels */}
          {[1, 5, 10, 15, 20, 25, totalDays].map((day) => (
            <text
              key={day}
              x={getX(day)}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-ledger-inkSubtle font-mono"
            >
              Day {day}
            </text>
          ))}
        </svg>

        {/* Status Callout Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 gap-2 border-t border-ledger-borderSubtle">
          <div className="text-ledger-inkMuted">
            Day {currentDay} of {totalDays} • Spent:{" "}
            <span className="font-semibold text-ledger-ink tabular-nums">{formatINR(currentSpend)}</span>
          </div>
          <div
            className={`font-semibold flex items-center gap-1 ${
              isOverPace ? "text-ledger-red" : "text-ledger-sage"
            }`}
          >
            <span>
              {isOverPace
                ? `Pacing ${formatINR(currentSpend - currentPaceTarget)} ahead of budget schedule`
                : `Pacing ${formatINR(currentPaceTarget - currentSpend)} under budget schedule`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
