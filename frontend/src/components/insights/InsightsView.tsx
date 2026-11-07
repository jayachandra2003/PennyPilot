import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  ArrowRight,
  ArrowDownRight,
  Check,
  CheckCircle2,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import type { BudgetPace, AnomalyItem, MonthlySummary } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { CalendarMonthPicker } from "../common/CalendarMonthPicker";
import {
  exportInsightsCSV,
  exportInsightsPDF,
  exportInsightsDOCX,
  type InsightsExportData,
} from "../../lib/exportReports";

interface InsightsViewProps {
  pace?: BudgetPace;
  anomalies?: AnomalyItem[];
  summary?: MonthlySummary;
  selectedYear: number;
  selectedMonth: number;
  onMonthChange?: (year: number, month: number) => void;
  onNavigateToBudgets: () => void;
  onNavigateToTransactions: () => void;
  onNavigateToAnalytics: () => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    return `${day} ${MONTH_ABBR[monthIdx] || parts[1]} ${year}`;
  }
  return dateStr;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  pace,
  anomalies = [],
  summary,
  selectedYear,
  selectedMonth,
  onMonthChange,
  onNavigateToBudgets,
  onNavigateToTransactions,
  onNavigateToAnalytics: _onNavigateToAnalytics,
}) => {
  const monthName = MONTH_NAMES[selectedMonth - 1] || "Current Month";
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = (format: "csv" | "pdf" | "docx") => {
    setIsExportMenuOpen(false);
    const exportData: InsightsExportData = {
      year: selectedYear,
      month: selectedMonth,
      monthName,
      pace,
      anomalies,
      summary,
    };
    if (format === "csv") exportInsightsCSV(exportData);
    else if (format === "pdf") exportInsightsPDF(exportData);
    else if (format === "docx") exportInsightsDOCX(exportData);
  };

  // Metrics derivation
  const spentPaise = pace?.spent_paise ?? summary?.expense_paise ?? 0;
  const totalBudgetPaise = pace?.limit_paise ?? 0;
  const leftToSpendPaise = pace?.remaining_paise ?? Math.max(0, totalBudgetPaise - spentPaise);
  const totalIncomePaise = summary?.income_paise ?? 0;
  const netSavingsPaise = summary?.net_balance_paise ?? Math.max(0, totalIncomePaise - spentPaise);
  const savingsRate = summary?.savings_rate_percent ?? (totalIncomePaise > 0 ? (netSavingsPaise / totalIncomePaise) * 100 : 0);

  const elapsedDays = pace?.elapsed_days ?? new Date().getDate();
  const totalDays = pace?.total_days ?? 30;
  const remainingDays = pace?.remaining_days ?? Math.max(0, totalDays - elapsedDays);

  const isOverPace = pace?.is_over_budget ?? (totalBudgetPaise > 0 && spentPaise > totalBudgetPaise);
  const targetPaiseByToday = pace?.target_pace_paise ?? (totalDays > 0 ? Math.round((totalBudgetPaise / totalDays) * elapsedDays) : 0);
  const hasCaution = !isOverPace && spentPaise > targetPaiseByToday;

  // Daily figures
  const actualDailyPaise = elapsedDays > 0 ? Math.round(spentPaise / elapsedDays) : 0;
  const targetDailyPaise = totalDays > 0 ? Math.round(totalBudgetPaise / totalDays) : 0;

  // Percentage for progress bar
  const spentPercent = totalBudgetPaise > 0 ? (spentPaise / totalBudgetPaise) * 100 : 0;
  const targetPercent = totalBudgetPaise > 0 ? (targetPaiseByToday / totalBudgetPaise) * 100 : 0;

  // Grounded narrative text
  let pacingNarrative = "";
  if (isOverPace) {
    pacingNarrative = `Attention: Current daily spend (${formatINR(actualDailyPaise)}/day) exceeds your allowable pacing (${formatINR(targetDailyPaise)}/day). Consider trimming non-essential expenses to avoid a budget deficit.`;
  } else if (hasCaution) {
    pacingNarrative = `Caution: Spending is approaching your scheduled calendar timeline. You have ${formatINR(leftToSpendPaise)} remaining for the next ${remainingDays} days.`;
  } else {
    const projectedSavingsPaise = Math.max(0, totalBudgetPaise - (actualDailyPaise * totalDays));
    pacingNarrative = `Yes. If you keep spending like this, you'll save about ${formatINR(projectedSavingsPaise)} by the end of the month.`;
  }

  return (
    <div className="space-y-6 sm:space-y-7 animate-fade-in min-w-0 max-w-6xl mx-auto">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Financial Insights
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Calendar Month Picker */}
          {onMonthChange ? (
            <CalendarMonthPicker
              year={selectedYear}
              month={selectedMonth}
              onSelect={onMonthChange}
            />
          ) : (
            <div className="flex items-center gap-2 bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 px-3.5 py-2 rounded-xl shadow-xs font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{monthName} {selectedYear}</span>
            </div>
          )}

          {/* Download Report Dropdown */}
          <div className="relative z-30" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#121C28] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs focus-ring cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Download Report</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-[#141F2E] border border-slate-200 dark:border-white/10 shadow-float py-1.5 z-50 animate-fade-in text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="font-semibold block">PDF Statement</span>
                    <span className="text-[10px] text-slate-400 block">Printable summary (.pdf)</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("docx")}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="font-semibold block">Word Document</span>
                    <span className="text-[10px] text-slate-400 block">Editable document (.docx)</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold block">CSV Spreadsheet</span>
                    <span className="text-[10px] text-slate-400 block">Raw tabular figures (.csv)</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Three Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Spent so far */}
        <div className="bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
              Spent so far
            </span>
            <div className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatINR(spentPaise)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              of your {formatINR(totalBudgetPaise)} budget
            </p>
          </div>
        </div>

        {/* Card 2: Left to spend */}
        <div className="bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
              Left to spend
            </span>
            <div className="w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-bold text-teal-700 dark:text-teal-400 tabular-nums">
              {formatINR(leftToSpendPaise)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {remainingDays} days left in {monthName}
            </p>
          </div>
        </div>

        {/* Card 3: Money kept */}
        <div className="bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
              Money kept
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-serif text-3xl font-bold text-teal-700 dark:text-teal-400 tabular-nums">
              {savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formatINR(netSavingsPaise)} of {formatINR(totalIncomePaise)} · your goal is 25%
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Monthly Financial Pacing Card: "Are you on track?" */}
      <div className="bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Are you on track?
          </h2>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isOverPace
                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300"
                : "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOverPace ? "bg-amber-500" : "bg-teal-500"}`} />
              {isOverPace ? "Over pace" : hasCaution ? "Pacing caution" : "On track"}
            </span>
            <button
              type="button"
              onClick={onNavigateToBudgets}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <span>Adjust budgets</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Grounded narrative explanation */}
        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
          {pacingNarrative}
        </p>

        {/* Progress Bar with Tick Marker */}
        <div className="space-y-2 pt-1">
          <div className="relative w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-visible">
            {/* Spent Fill */}
            <div
              className="h-full rounded-full bg-teal-600 dark:bg-teal-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, spentPercent))}%` }}
            />
            {/* Tick Marker for Planned by Today */}
            <div
              className="absolute top-[-5px] bottom-[-5px] w-0.5 bg-slate-900 dark:bg-slate-100 z-10"
              style={{ left: `${Math.min(100, Math.max(0, targetPercent))}%` }}
              title={`Planned by today: ${formatINR(targetPaiseByToday)}`}
            />
          </div>

          {/* Progress Bar Labels */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-500" />
              Spent so far {formatINR(spentPaise)}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
              Planned by today {formatINR(targetPaiseByToday)}
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Monthly budget {formatINR(totalBudgetPaise)}
            </span>
          </div>
        </div>

        {/* Three Sub-Telemetry Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <div className="sm:border-r border-slate-100 dark:border-white/5 pr-4">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">You spend per day</span>
            <span className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatINR(actualDailyPaise)}
            </span>
          </div>
          <div className="sm:border-r border-slate-100 dark:border-white/5 pr-4">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Planned per day</span>
            <span className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatINR(targetDailyPaise)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Where we are in the month</span>
            <span className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-100">
              Day {elapsedDays} of {totalDays}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Unusual Purchases Section */}
      <div className="bg-white dark:bg-[#121C28] border border-slate-200/90 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Unusual purchases
          </h2>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
              {anomalies.length} found
            </span>
            <button
              type="button"
              onClick={onNavigateToTransactions}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <span>Check in Transactions</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {anomalies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((item) => (
              <div
                key={item.transaction_id}
                className="p-5 rounded-2xl bg-[#FFFDF7] dark:bg-[#1A232E] border border-amber-200/80 dark:border-amber-700/50 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                      {item.description || "Unusual Transaction"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatDisplayDate(item.date)}
                    </p>
                  </div>
                  <span className="font-bold text-lg font-tabular text-slate-900 dark:text-slate-100">
                    {formatINR(item.amount_paise)}
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-3 font-medium">
                  {item.multiple_of_median} times higher than usual (usual: {formatINR(item.baseline_median_paise)})
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-white/5">
            <CheckCircle2 className="w-8 h-8 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No unusual purchases detected
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              All transactions in {monthName} are within normal historical variance ranges (Median Absolute Deviation engine).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
