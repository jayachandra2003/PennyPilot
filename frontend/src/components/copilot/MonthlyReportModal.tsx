import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  FileText,
  FileCode,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import type { MonthlyReportResponse } from "../../lib/api";
import {
  exportMonthlyStatementCSV,
  exportMonthlyStatementDOCX,
  exportMonthlyStatementPDF,
} from "../../lib/exportReports";

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MonthlyReportResponse | null;
  isLoading: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExportMenuOpen]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const monthName = report ? MONTH_NAMES[report.month - 1] || `Month ${report.month}` : "";
  const facts = report?.measured_facts || {};
  const categories: any[] = ((facts.categories as unknown) as any[]) || [];

  const healthColor =
    report?.health_status === "Exceptional"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      : report?.health_status === "Healthy"
      ? "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20"
      : report?.health_status === "Moderate"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:relative">
      <div className="bg-white dark:bg-[#121C28] w-full max-w-4xl max-h-[88vh] sm:max-h-[90vh] rounded-3xl shadow-2xl border border-ledger-border flex flex-col overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none">
        {/* Document Header Controls */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-ledger-border flex items-center justify-between bg-ledger-surfaceSubtle shrink-0 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="PennyPilot" className="w-6 h-6 object-contain" />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
                Personal Financial Statement
              </h2>
              <p className="text-xs text-ledger-inkMuted">
                {report ? `${monthName} ${report.year} Reporting Period` : "Compiling multi-period facts..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Menu Dropdown */}
            {report && (
              <div className="relative" ref={exportDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ledger-border bg-ledger-surface hover:bg-ledger-surfaceHover text-xs font-semibold text-ledger-ink shadow-sm transition-colors focus-ring"
                >
                  <Download className="w-3.5 h-3.5 text-ledger-teal" />
                  <span>Download Report</span>
                  <ChevronDown className="w-3.5 h-3.5 text-ledger-inkMuted" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-white dark:bg-[#141F2E] border border-slate-200/90 dark:border-white/10 shadow-xl py-1.5 z-50 animate-scale-up">
                    <button
                      type="button"
                      onClick={() => {
                        exportMonthlyStatementPDF(report);
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-rose-500" />
                      <div>
                        <div className="font-semibold">PDF Statement</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Formal printable statement (.pdf)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportMonthlyStatementDOCX(report);
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors"
                    >
                      <FileCode className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="font-semibold">Word Document</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Editable structured document (.docx)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        exportMonthlyStatementCSV(report);
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-2.5 transition-colors border-t border-slate-100 dark:border-white/5"
                    >
                      <Download className="w-4 h-4 text-emerald-500" />
                      <div>
                        <div className="font-semibold">CSV Spreadsheet</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Tabular metrics (.csv)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {report && (
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surface rounded-xl transition-colors border border-transparent hover:border-ledger-border"
                title="Print Statement"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surface rounded-xl transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formal Personal Financial Statement Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-ledger-ink bg-white dark:bg-[#121C28] print:p-0">
          {isLoading || !report ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-ledger-teal border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-ledger-inkMuted">
                Compiling multi-period ledger facts and calculating budget pacing...
              </p>
            </div>
          ) : (
            <>
              {/* Document Cover / Formal Header */}
              <div className="border-b border-ledger-border pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-ledger-teal text-xs font-bold uppercase tracking-wider mb-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Official Monthly Financial Statement</span>
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ledger-ink">
                    Statement for {monthName} {report.year}
                  </h1>
                  <p className="text-xs text-ledger-inkMuted mt-1">
                    Generated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • Prepared by PennyPilot Institutional Ledger
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${healthColor}`}>
                    ● {report.health_status} Posture
                  </span>
                </div>
              </div>

              {/* 1. Executive Summary & Measured Facts */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
                    1. Executive Summary & Key Telemetry
                  </h2>
                  <span className="text-xs text-ledger-inkMuted font-mono">
                    {facts.transaction_count || 0} Transactions Verified
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-ledger-surfaceSubtle border border-ledger-border">
                    <span className="text-[11px] font-semibold text-ledger-inkMuted uppercase tracking-wider block">
                      Total Inflow
                    </span>
                    <span className="font-serif text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {facts.income || "₹0.00"}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle block mt-0.5">Primary income streams</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ledger-surfaceSubtle border border-ledger-border">
                    <span className="text-[11px] font-semibold text-ledger-inkMuted uppercase tracking-wider block">
                      Total Outflow
                    </span>
                    <span className="font-serif text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {facts.expenses || "₹0.00"}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle block mt-0.5">Living debits & expenses</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ledger-surfaceSubtle border border-ledger-border">
                    <span className="text-[11px] font-semibold text-ledger-inkMuted uppercase tracking-wider block">
                      Net Capital Retained
                    </span>
                    <span className="font-serif text-lg font-bold text-ledger-ink tabular-nums">
                      {facts.net_balance || "₹0.00"}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle block mt-0.5">Retained monthly surplus</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ledger-surfaceSubtle border border-ledger-border">
                    <span className="text-[11px] font-semibold text-ledger-inkMuted uppercase tracking-wider block">
                      Savings Rate
                    </span>
                    <span className="font-serif text-lg font-bold text-ledger-teal tabular-nums">
                      {facts.savings_rate || "0%"}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle block mt-0.5">Target benchmark: ≥ 25.0%</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ledger-surfaceSubtle border border-ledger-border">
                    <span className="text-[11px] font-semibold text-ledger-inkMuted uppercase tracking-wider block">
                      Budget Allocated
                    </span>
                    <span className="font-serif text-lg font-bold text-ledger-ink tabular-nums">
                      {facts.budget_limit || "₹0.00"}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle block mt-0.5">Ceilings configured</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ledger-surfaceSubtle border border-ledger-border">
                    <span className="text-[11px] font-semibold text-ledger-inkMuted uppercase tracking-wider block">
                      Budget Utilization
                    </span>
                    <span className="font-serif text-lg font-bold text-ledger-ink tabular-nums">
                      {facts.budget_utilization || "0%"}
                    </span>
                    <span className="text-[10px] text-ledger-inkSubtle block mt-0.5">Pacing: {facts.budget_pace_status || "on_track"}</span>
                  </div>
                </div>

                {/* Narrative Summary Callout */}
                <div className="p-4 rounded-2xl bg-ledger-surfaceSubtle border border-ledger-border text-xs sm:text-sm leading-relaxed text-ledger-ink">
                  <p className="font-serif italic text-ledger-inkMuted">
                    "{report.executive_summary.replace(/\*\*/g, "")}"
                  </p>
                </div>
              </section>

              {/* 2. Expense Analysis by Category */}
              <section className="space-y-4">
                <h2 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
                  2. Expense Analysis & Category Distribution
                </h2>

                <div className="border border-ledger-border rounded-2xl overflow-hidden bg-ledger-surface">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-ledger-surfaceSubtle border-b border-ledger-border text-ledger-inkMuted uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4 text-right">Outflow (₹)</th>
                        <th className="py-2.5 px-4 text-center">Share of Spend</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ledger-border">
                      {categories.length > 0 ? (
                        categories.map((cat, idx) => (
                          <tr key={idx} className="hover:bg-ledger-surfaceSubtle/60 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-ledger-ink">
                              {cat.category_name}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-ledger-ink">
                              {cat.formatted_total}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className="h-full bg-ledger-teal rounded-full"
                                    style={{ width: `${Math.min(100, cat.percentage)}%` }}
                                  />
                                </div>
                                <span className="tabular-nums font-semibold text-ledger-inkMuted">
                                  {cat.percentage}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {cat.percentage > 35 ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                  ● Dominant Outflow
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                  ● Balanced
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-ledger-inkMuted">
                            No expense records recorded for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 3. Budget Performance & Pacing */}
              <section className="space-y-4">
                <h2 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
                  3. Budget Performance & Buffer Cushion
                </h2>

                <div className="p-4 rounded-2xl border border-ledger-border bg-ledger-surfaceSubtle space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ledger-ink">
                      Monthly Spending Velocity vs Calendar Timeline
                    </span>
                    <span className="text-xs font-bold text-ledger-teal">
                      {facts.budget_utilization || "0%"} of Total Budget Consumed
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-ledger-teal rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, parseFloat(String(facts.budget_utilization || "0")))}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-ledger-inkSubtle block">Total Allocated</span>
                      <span className="font-semibold text-ledger-ink tabular-nums">{facts.budget_limit || "₹0.00"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ledger-inkSubtle block">Month Spend</span>
                      <span className="font-semibold text-ledger-ink tabular-nums">{facts.budget_spent || "₹0.00"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ledger-inkSubtle block">MoM Expense Delta</span>
                      <span className="font-semibold text-ledger-ink tabular-nums">{facts.mom_expense_change || "₹0.00"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ledger-inkSubtle block">Dominant Area</span>
                      <span className="font-semibold text-ledger-ink">{facts.top_category_name || "None"}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Statistical Outliers & Observations */}
              <section className="space-y-4">
                <h2 className="font-serif text-base sm:text-lg font-bold text-ledger-ink">
                  4. Key Financial Observations & Anomaly Detections
                </h2>

                {report.anomalies && report.anomalies.length > 0 ? (
                  <div className="border border-ledger-border rounded-2xl overflow-hidden bg-ledger-surface">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-ledger-surfaceSubtle border-b border-ledger-border text-ledger-inkMuted uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Date</th>
                          <th className="py-2.5 px-4">Description</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                          <th className="py-2.5 px-4">Detection Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ledger-border">
                        {report.anomalies.map((a, i) => (
                          <tr key={i} className="hover:bg-ledger-surfaceSubtle/60 transition-colors">
                            <td className="py-2.5 px-4 tabular-nums text-ledger-inkMuted">{a.date}</td>
                            <td className="py-2.5 px-4 font-semibold text-ledger-ink">{a.description}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                              {a.amount}
                            </td>
                            <td className="py-2.5 px-4 text-ledger-inkSubtle">{a.evidence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>No statistical spending spikes or MAD anomalies detected for this reporting period.</span>
                  </div>
                )}

                {/* Recommendations List */}
                {report.recommendations && report.recommendations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {report.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-ledger-surfaceSubtle border border-ledger-border text-xs leading-relaxed text-ledger-ink flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-ledger-teal/15 text-ledger-teal flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <p>{rec.replace(/\*\*/g, "")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 5. Statement Certification & Legal Disclosures */}
              <div className="pt-6 border-t border-ledger-border text-[11px] text-ledger-inkSubtle space-y-1">
                <p className="font-semibold text-ledger-inkMuted">
                  Certification & Data Integrity
                </p>
                <p>
                  {report.disclaimer}
                </p>
                <p className="text-[10px] text-ledger-inkSubtle/80 pt-1">
                  PennyPilot Personal Finance System • Deterministic Arithmetic • Zero Financial Hallucination
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
