import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  AlertCircle,
  Table as TableIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PieChart,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  FileText,
  FileType,
  ChevronDown,
} from "lucide-react";
import type { HistoricalAnalyticsResponse, HistoricalMonthSummary } from "../../lib/api";
import { fetchHistoricalAnalytics } from "../../lib/api";
import { GlassIcon } from "../common/GlassIcon";
import { CalendarMonthPicker } from "../common/CalendarMonthPicker";
import {
  exportAnalyticsCSV,
  exportAnalyticsPDF,
  exportAnalyticsDOCX,
} from "../../lib/exportReports";

interface HistoricalAnalyticsProps {
  initialYear?: number;
  initialMonth?: number;
}

export const HistoricalAnalytics: React.FC<HistoricalAnalyticsProps> = ({
  initialYear = 2026,
  initialMonth = 11,
}) => {
  const [endYear, setEndYear] = useState<number>(initialYear);
  const [endMonth, setEndMonth] = useState<number>(initialMonth);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(5); // default to latest month (index 5)
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

  const {
    data: analytics,
    isLoading,
    isError,
  } = useQuery<HistoricalAnalyticsResponse>({
    queryKey: ["historical-analytics", endYear, endMonth],
    queryFn: () => fetchHistoricalAnalytics({ months: 6, endYear, endMonth }),
  });

  const months = analytics?.months || [];
  const overall = analytics?.overall;

  const selectedMonth: HistoricalMonthSummary | undefined = months[selectedMonthIndex] || months[months.length - 1];

  // Maximum value for scaling SVG chart bars
  const maxBarValue = useMemo(() => {
    if (!months || months.length === 0) return 100000;
    const maxVal = Math.max(
      ...months.map((m) => Math.max(m.income_paise, m.expense_paise)),
      100000 // minimum scale 1000 INR to prevent div by 0
    );
    return maxVal;
  }, [months]);

  const handlePrevPeriod = () => {
    let m = endMonth - 1;
    let y = endYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setEndMonth(m);
    setEndYear(y);
  };

  const handleNextPeriod = () => {
    let m = endMonth + 1;
    let y = endYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setEndMonth(m);
    setEndYear(y);
  };

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      {/* Top Header & Range Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Historical Financial Analytics
          </h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">
            6-month retrospective on cash flow, savings rate progression, and month-over-month category shifts.
          </p>
        </div>

        {/* Period Navigation & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto relative z-30">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl p-0.5 shadow-xs relative z-40 select-none">
            <button
              type="button"
              onClick={handlePrevPeriod}
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-ring cursor-pointer"
              title="Previous period"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <CalendarMonthPicker
              year={endYear}
              month={endMonth}
              onSelect={(y, m) => {
                setEndYear(y);
                setEndMonth(m);
              }}
            />

            <button
              type="button"
              onClick={handleNextPeriod}
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-ring cursor-pointer"
              title="Next period"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Chart vs Table toggle */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`px-2.5 py-1.5 rounded-lg transition-colors min-h-[36px] flex items-center justify-center gap-1.5 text-xs font-semibold focus-ring cursor-pointer ${
                viewMode === "chart"
                  ? "bg-white dark:bg-[#121C28] text-teal-800 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-white/10"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              title="Visual Chart View"
              aria-label="Visual Chart View"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg transition-colors min-h-[36px] flex items-center justify-center gap-1.5 text-xs font-semibold focus-ring cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-[#121C28] text-teal-800 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-white/10"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              title="Data Table View"
              aria-label="Data Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Export Report Dropdown (CSV, PDF, DOCX) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="btn-secondary text-xs px-3 py-1.5 min-h-[36px] flex items-center gap-1.5 shadow-xs cursor-pointer focus-ring"
              aria-expanded={isExportMenuOpen}
              aria-haspopup="true"
              title="Export Analytics Statement"
            >
              <Download className="w-3.5 h-3.5 text-ledger-teal" />
              <span className="font-semibold">Export Report</span>
              <ChevronDown className="w-3 h-3 text-ledger-inkSubtle" />
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-2xl bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-modal p-1.5 space-y-0.5 animate-fade-in text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (analytics) exportAnalyticsCSV(analytics);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-ledger-ink hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-ledger-ink">CSV Spreadsheet</div>
                      <div className="text-[10px] text-ledger-inkSubtle">Raw historical data (.csv)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (analytics) exportAnalyticsPDF(analytics);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-ledger-ink hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-ledger-ink">PDF Statement</div>
                      <div className="text-[10px] text-ledger-inkSubtle">Printable audit report (.pdf)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (analytics) exportAnalyticsDOCX(analytics);
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-ledger-ink hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <FileType className="w-4 h-4 text-sky-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-ledger-ink">DOCX Document</div>
                      <div className="text-[10px] text-ledger-inkSubtle">Word report (.docx)</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-200/60 border border-slate-200" />
            ))}
          </div>
          <div className="h-72 rounded-xl bg-slate-200/60 border border-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200/60 border border-slate-200" />
        </div>
      ) : isError || !analytics || !overall ? (
        <div className="p-12 text-center rounded-xl border border-ledger-border bg-ledger-surface text-ledger-ink">
          <AlertCircle className="w-8 h-8 text-ledger-red mx-auto mb-2" />
          <h3 className="text-sm font-semibold">Failed to load analytics</h3>
          <p className="text-xs text-ledger-inkSubtle mt-1">
            Unable to load financial analytics for the selected range.
          </p>
        </div>
      ) : (
        <>
          {/* 4 Primary 6-Month Macro Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 shadow-card flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  6-Month Income
                </span>
                <GlassIcon icon={TrendingUp} variant="emerald" size="xs" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {overall.total_income_formatted}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  Total
                </span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1.5 block">
                Avg {overall.average_monthly_income_formatted} / mo
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 shadow-card flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  6-Month Expenses
                </span>
                <GlassIcon icon={TrendingDown} variant="rose" size="xs" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {overall.total_expense_formatted}
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-full font-bold border border-rose-500/30">
                  Total
                </span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1.5 block">
                Avg {overall.average_monthly_expense_formatted} / mo
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 shadow-card flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Total Net Savings
                </span>
                <GlassIcon icon={Wallet} variant="teal" size="xs" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    overall.total_net_savings_paise >= 0 ? "text-teal-700 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {overall.total_net_savings_formatted}
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    overall.overall_savings_rate_percent >= 20
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  }`}
                >
                  {overall.overall_savings_rate_percent}% Rate
                </span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1.5 block">
                Avg {overall.average_monthly_savings_formatted} / mo
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 shadow-card flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Active Ledger History
                </span>
                <GlassIcon icon={Calendar} variant="indigo" size="xs" />
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {overall.active_months_count} / {overall.months_count}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-300 bg-slate-500/15 px-2.5 py-0.5 rounded-full font-bold border border-slate-400/30">
                  Months
                </span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1.5 block">
                {months.reduce((acc, m) => acc + m.transaction_count, 0)} total recorded transactions
              </span>
            </div>
          </div>

          {/* VISUAL CHART VIEW */}
          {viewMode === "chart" && (
            <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    6-Month Income vs. Expense Trends
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                    Click any month bar to inspect its detailed category spend and Month-over-Month shift.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-semibold self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-600 inline-block" />
                    <span className="text-slate-800 dark:text-slate-200">Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
                    <span className="text-slate-800 dark:text-slate-200">Expense</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-800 dark:bg-teal-400 border border-white dark:border-slate-900 inline-block shadow-xs" />
                    <span className="text-slate-800 dark:text-slate-200">Net Savings</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart with Horizontal Reference Guidelines */}
              <div className="relative pt-4 pb-2">
                {/* Horizontal Reference Lines */}
                <div className="absolute inset-x-0 top-6 bottom-16 flex flex-col justify-between pointer-events-none opacity-40 dark:opacity-20 z-0">
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
                  <div className="border-b border-slate-300 dark:border-slate-600 w-full" />
                </div>

                <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-60 w-full relative z-10">
                  {months.map((m, idx) => {
                    const isSelected = idx === selectedMonthIndex;
                    const isHovered = idx === activeTooltip;

                    const incomeHeightPct = Math.round((m.income_paise / maxBarValue) * 100);
                    const expenseHeightPct = Math.round((m.expense_paise / maxBarValue) * 100);

                    return (
                      <div
                        key={`${m.year}-${m.month}`}
                        onClick={() => setSelectedMonthIndex(idx)}
                        onMouseEnter={() => setActiveTooltip(idx)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        className={`group relative flex flex-col items-center justify-end h-full cursor-pointer rounded-xl p-2 transition-all focus-ring ${
                          isSelected
                            ? "bg-teal-50/60 dark:bg-teal-950/30 border-2 border-teal-600 dark:border-teal-400 shadow-sm"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                        }`}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isSelected}
                        aria-label={`Month ${m.month_name}: Income ${m.income_formatted}, Expense ${m.expense_formatted}`}
                      >
                        {/* Bars Container */}
                        <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2.5 h-44 pb-1">
                          {m.is_empty ? (
                            <div className="w-full flex flex-col items-center justify-end h-full pb-2">
                              <div className="w-full max-w-[36px] sm:max-w-[44px] h-10 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-center">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono select-none">—</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Income Bar */}
                              <div className="w-1/2 max-w-[32px] sm:max-w-[36px] flex flex-col justify-end h-full">
                                <div
                                  style={{ height: `${Math.max(incomeHeightPct, 6)}%` }}
                                  className={`w-full rounded-t-md transition-all shadow-xs ${
                                    isSelected
                                      ? "bg-emerald-600 dark:bg-emerald-400"
                                      : "bg-emerald-500/85 group-hover:bg-emerald-600 dark:bg-emerald-500/80 dark:group-hover:bg-emerald-400"
                                  }`}
                                />
                              </div>

                              {/* Expense Bar */}
                              <div className="w-1/2 max-w-[32px] sm:max-w-[36px] flex flex-col justify-end h-full">
                                <div
                                  style={{ height: `${Math.max(expenseHeightPct, 6)}%` }}
                                  className={`w-full rounded-t-md transition-all shadow-xs ${
                                    isSelected
                                      ? "bg-rose-600 dark:bg-rose-400"
                                      : "bg-rose-500/85 group-hover:bg-rose-600 dark:bg-rose-500/80 dark:group-hover:bg-rose-400"
                                  }`}
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Month Label */}
                        <div className="text-center pt-2 border-t border-slate-200 dark:border-white/10 w-full">
                          <span
                            className={`text-xs sm:text-sm font-bold block leading-tight ${
                              isSelected ? "text-teal-800 dark:text-teal-300" : "text-slate-900 dark:text-slate-100"
                            }`}
                          >
                            {m.month_short}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono font-medium">
                            '{String(m.year).slice(2)}
                          </span>
                        </div>

                        {/* Savings Rate Tag / Empty state badge */}
                        <div className="mt-1 h-5 flex items-center justify-center">
                          {m.is_empty ? (
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                              No entries
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                              {m.savings_rate_percent}%
                            </span>
                          )}
                        </div>

                        {/* Tooltip on Hover (Quiet Ledger & Midnight Ledger Design) */}
                        {isHovered && (
                          <div className="absolute -top-28 sm:-top-32 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-white dark:bg-[#141F2E] text-slate-900 dark:text-slate-100 border border-slate-200/90 dark:border-white/10 rounded-xl p-3 sm:p-3.5 shadow-[0_12px_28px_-4px_rgba(15,23,42,0.15)] dark:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.6)] text-xs w-52 space-y-1.5 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                              <span className="font-sans font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                                {m.month_name} {m.year}
                              </span>
                              {m.is_empty ? (
                                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                  No Activity
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60 font-semibold tabular-nums">
                                  {m.savings_rate_percent}% saved
                                </span>
                              )}
                            </div>

                            {m.is_empty ? (
                              <div className="py-1 text-center text-slate-500 dark:text-slate-400 text-[11px] font-sans">
                                No ledger transactions recorded for this period.
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Total Inflow:
                                  </span>
                                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                    {m.income_formatted}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Total Outflow:
                                  </span>
                                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                                    {m.expense_formatted}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-0.5">
                                  <span className="text-slate-700 dark:text-slate-300 font-sans">
                                    Net Savings:
                                  </span>
                                  <span className={`font-mono tabular-nums ${m.net_balance_paise >= 0 ? "text-slate-900 dark:text-slate-100" : "text-rose-600 dark:text-rose-400"}`}>
                                    {m.net_balance_formatted}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ACCESSIBLE TABULAR ALTERNATIVE */}
          {viewMode === "table" && (
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121C28] shadow-card overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Historical Financial Summary (6-Month Table)
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  Screen-reader accessible tabular audit with integer paise precision and Month-over-Month shift analysis.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <caption className="sr-only">
                    6-month financial performance with income, expense, net savings, and savings rate.
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th scope="col" className="py-3 px-4">Month</th>
                      <th scope="col" className="py-3 px-4 text-right">Income</th>
                      <th scope="col" className="py-3 px-4 text-right">Expense</th>
                      <th scope="col" className="py-3 px-4 text-right">Net Savings</th>
                      <th scope="col" className="py-3 px-4 text-right">Savings Rate</th>
                      <th scope="col" className="py-3 px-4 text-right">MoM Expense Shift</th>
                      <th scope="col" className="py-3 px-4 text-center">Entries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10 font-mono">
                    {months.map((m, idx) => (
                      <tr
                        key={`${m.year}-${m.month}`}
                        onClick={() => setSelectedMonthIndex(idx)}
                        className={`cursor-pointer transition-colors ${
                          idx === selectedMonthIndex
                            ? "bg-slate-100 dark:bg-slate-800/70 font-semibold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3 px-4 font-sans font-semibold text-slate-900 dark:text-slate-100">
                          {m.month_name}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                          {m.income_formatted}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-700 dark:text-rose-400 font-semibold">
                          {m.expense_formatted}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            m.net_balance_paise >= 0 ? "text-teal-700 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {m.net_balance_formatted}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {m.is_empty ? (
                            <span className="text-slate-400 dark:text-slate-500 font-sans">0.0%</span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                m.savings_rate_percent >= 20
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {m.savings_rate_percent}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          {m.expense_mom_delta_paise == null ? (
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
                          ) : m.expense_mom_delta_paise > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center gap-0.5">
                              +{m.expense_mom_delta_formatted} ({m.expense_mom_pct}%)
                            </span>
                          ) : m.expense_mom_delta_paise < 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                              {m.expense_mom_delta_formatted} ({m.expense_mom_pct}%)
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">₹0.00 (0.0%)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-sans text-slate-700 dark:text-slate-300 font-medium">
                          {m.transaction_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SELECTED MONTH DRILLDOWN PANEL */}
          {selectedMonth && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Month Overview & MoM Comparison (Solid De-Blurred Surface) */}
              <div className="lg:col-span-1 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121C28] shadow-card space-y-4">
                <div className="border-b border-slate-200 dark:border-white/10 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 font-mono">
                    Inspecting Period
                  </span>
                  <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedMonth.month_name}
                  </h3>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                    {selectedMonth.first_day} to {selectedMonth.last_day} ({selectedMonth.total_days} days)
                  </span>
                </div>

                {selectedMonth.is_empty ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      No active transactions were recorded for {selectedMonth.month_name}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Net Balance</span>
                      <span
                        className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                          selectedMonth.net_balance_paise >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {selectedMonth.net_balance_formatted}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Savings Rate</span>
                      <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                        {selectedMonth.savings_rate_percent}%
                      </span>
                    </div>

                    {/* Month-over-Month Shift Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/70 space-y-2.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                        Month-over-Month Shift
                      </span>

                      {selectedMonth.expense_mom_delta_paise == null ? (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Initial month in the 6-month retrospective window. No prior baseline available.
                        </p>
                      ) : (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Expenses:</span>
                            <span
                              className={`font-semibold font-mono tabular-nums ${
                                (selectedMonth.expense_mom_delta_paise || 0) > 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {(selectedMonth.expense_mom_delta_paise || 0) > 0 ? "+" : ""}
                              {selectedMonth.expense_mom_delta_formatted} ({selectedMonth.expense_mom_pct}%)
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Income:</span>
                            <span
                              className={`font-semibold font-mono tabular-nums ${
                                (selectedMonth.income_mom_delta_paise || 0) >= 0
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {(selectedMonth.income_mom_delta_paise || 0) > 0 ? "+" : ""}
                              {selectedMonth.income_mom_delta_formatted || "₹0.00"} ({selectedMonth.income_mom_pct}%)
                            </span>
                          </div>

                          {selectedMonth.savings_rate_mom_delta != null && (
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-slate-700/60">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">Savings Rate Shift:</span>
                              <span
                                className={`font-semibold font-mono tabular-nums ${
                                  selectedMonth.savings_rate_mom_delta >= 0
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : "text-rose-700 dark:text-rose-400"
                                }`}
                              >
                                {selectedMonth.savings_rate_mom_delta >= 0 ? "+" : ""}
                                {selectedMonth.savings_rate_mom_delta}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Month Category Breakdown & Top Categories (Solid De-Blurred Surface) */}
              <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121C28] shadow-card space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {selectedMonth.month_name} Category Breakdown
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Distribution of active expenses across categories in {selectedMonth.month_name}.
                    </p>
                  </div>
                  <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-400">
                    {selectedMonth.category_breakdown.length} Categories
                  </span>
                </div>

                {selectedMonth.category_breakdown.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <PieChart className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      No expense categorization recorded in this month.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {selectedMonth.category_breakdown.map((cat) => (
                      <div key={cat.category_id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {cat.category_name}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-900 dark:text-slate-100 font-bold tabular-nums">
                              {cat.formatted_total}
                            </span>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold border border-slate-200 dark:border-slate-700">
                              {cat.percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                          <div
                            style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                            className="h-full rounded-full bg-ledger-teal transition-all duration-300"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overall Top 6-Month Categories */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3">
                    Top Spending Categories Across Full 6-Month Period
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {overall.top_categories.slice(0, 4).map((topCat) => (
                      <div
                        key={topCat.category_id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between"
                      >
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {topCat.category_name}
                        </span>
                        <div className="text-right font-mono shrink-0 ml-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block tabular-nums">
                            {topCat.formatted_total}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-medium">
                            {topCat.percentage}% of total
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
