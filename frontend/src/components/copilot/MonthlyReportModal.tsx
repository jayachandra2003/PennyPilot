import React from "react";
import { X, Printer, ShieldCheck, TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import type { MonthlyReportResponse } from "../../lib/api";

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MonthlyReportResponse | null;
  isLoading: boolean;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const healthColor =
    report?.health_status === "Exceptional"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : report?.health_status === "Healthy"
      ? "bg-ledger-tealLight text-ledger-teal border-ledger-teal/30"
      : report?.health_status === "Pacing Alert" || report?.health_status === "At Risk"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : report?.health_status === "Moderate"
      ? "bg-blue-100 text-blue-800 border-blue-300"
      : "bg-red-100 text-red-800 border-red-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ledger-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-ledger-surface w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-modal border border-ledger-border flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-ledger-border flex items-center justify-between bg-ledger-bg/50">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-ledger-inkMuted">
              Financial Intelligence Report
            </span>
            <h2 className="font-serif text-xl font-bold text-ledger-ink">
              {report ? report.title : "Generating Intelligence Report..."}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <button
                onClick={handlePrint}
                className="p-2 text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surface rounded-lg transition-colors border border-transparent hover:border-ledger-border"
                title="Print Report"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-ledger-ink">
          {isLoading || !report ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-ledger-teal border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-ledger-inkMuted">
                Compiling multi-period ledger facts and calculating spending pace...
              </p>
            </div>
          ) : (
            <>
              {/* 1. Health Status & Executive Summary */}
              <div className="p-5 rounded-xl border border-ledger-border bg-ledger-bg/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ledger-inkMuted">
                    Executive Financial Verdict
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${healthColor}`}>
                    {report.health_status} Posture
                  </span>
                </div>
                <p className="font-serif text-sm md:text-base leading-relaxed text-ledger-ink">
                  {report.executive_summary}
                </p>
              </div>

              {/* 2. Measured Facts Block (Constitution: Distinct Separation) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ledger-ink">
                  <ShieldCheck className="w-4 h-4 text-ledger-teal" />
                  <span>Section A: Verified Measured Facts (Deterministic Ledger)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-ledger-bg rounded-lg border border-ledger-borderSubtle">
                    <div className="text-[11px] text-ledger-inkMuted">Total Income</div>
                    <div className="text-sm font-bold tabular-nums text-ledger-ink">
                      {report.measured_facts.income}
                    </div>
                  </div>
                  <div className="p-3 bg-ledger-bg rounded-lg border border-ledger-borderSubtle">
                    <div className="text-[11px] text-ledger-inkMuted">Total Expenses</div>
                    <div className="text-sm font-bold tabular-nums text-ledger-ink">
                      {report.measured_facts.expenses}
                    </div>
                  </div>
                  <div className="p-3 bg-ledger-bg rounded-lg border border-ledger-borderSubtle">
                    <div className="text-[11px] text-ledger-inkMuted">Net Cash Retained</div>
                    <div className="text-sm font-bold tabular-nums text-ledger-teal">
                      {report.measured_facts.net_balance}
                    </div>
                  </div>
                  <div className="p-3 bg-ledger-bg rounded-lg border border-ledger-borderSubtle">
                    <div className="text-[11px] text-ledger-inkMuted">Savings Rate</div>
                    <div className="text-sm font-bold tabular-nums text-ledger-ink">
                      {report.measured_facts.savings_rate}
                    </div>
                  </div>
                  <div className="p-3 bg-ledger-bg rounded-lg border border-ledger-borderSubtle">
                    <div className="text-[11px] text-ledger-inkMuted">Budget Utilization</div>
                    <div className="text-sm font-bold tabular-nums text-ledger-ink">
                      {report.measured_facts.budget_utilization}
                    </div>
                  </div>
                  <div className="p-3 bg-ledger-bg rounded-lg border border-ledger-borderSubtle">
                    <div className="text-[11px] text-ledger-inkMuted">MoM Expense Shift</div>
                    <div className="text-sm font-bold tabular-nums text-ledger-ink">
                      {report.measured_facts.mom_expense_change}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Category Shifts */}
              {report.category_shifts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ledger-ink">
                    <TrendingUp className="w-4 h-4 text-ledger-teal" />
                    <span>Section B: Category Shifts (Month-over-Month)</span>
                  </div>
                  <div className="p-3.5 bg-ledger-bg rounded-lg border border-ledger-borderSubtle space-y-1.5 text-xs">
                    {report.category_shifts.map((shift, idx) => (
                      <div key={idx} className="leading-relaxed">
                        {shift}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Statistical Anomalies */}
              {report.anomalies.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Section C: Statistical Spending Anomalies (MAD &ge; 3.0)</span>
                  </div>
                  <div className="space-y-2">
                    {report.anomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-900 space-y-1"
                      >
                        <div className="flex justify-between font-bold">
                          <span>{anom.description}</span>
                          <span className="tabular-nums font-mono">{anom.amount}</span>
                        </div>
                        <p className="text-[11px] text-amber-800">{anom.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. AI Actionable Recommendations */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ledger-teal">
                  <Lightbulb className="w-4 h-4 text-ledger-teal" />
                  <span>Section D: Actionable Intelligence & Recommendations</span>
                </div>
                <div className="p-4 bg-ledger-tealLight/40 border border-ledger-teal/20 rounded-xl space-y-2.5 text-xs text-ledger-ink">
                  {report.recommendations.map((rec, idx) => (
                    <div key={idx} className="leading-relaxed flex gap-2">
                      <span className="font-bold text-ledger-teal">{idx + 1}.</span>
                      <div>{rec}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Regulatory Disclaimer */}
              <div className="pt-4 border-t border-ledger-borderSubtle text-[11px] text-ledger-inkSubtle leading-relaxed">
                <p>
                  <strong>Disclaimer:</strong> {report.disclaimer}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-ledger-border bg-ledger-bg/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ledger-ink text-ledger-surface text-xs font-medium rounded-lg hover:bg-ledger-inkMuted transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
