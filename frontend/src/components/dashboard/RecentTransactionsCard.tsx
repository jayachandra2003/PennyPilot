import React from "react";
import { ArrowRight, Plus, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { TransactionItem } from "../../lib/api";
import { formatINR } from "../../lib/currency";

interface RecentTransactionsCardProps {
  transactions: TransactionItem[];
  onViewAll: () => void;
  onQuickAdd: () => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  onViewAll,
  onQuickAdd,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Recent Activity
          </span>
          <h3 className="font-sans text-lg sm:text-xl font-bold text-slate-900">
            Recent Transactions
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onQuickAdd}
            className="btn-secondary text-xs px-2.5 py-1 min-h-[32px] hidden sm:inline-flex items-center gap-1 focus-ring"
            title="Add transaction"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={onViewAll}
            className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 focus-ring py-1 px-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-10 space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs text-slate-500">No financial transactions recorded yet.</p>
          <button
            onClick={onQuickAdd}
            className="btn-primary text-xs focus-ring"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record your first expense</span>
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Ledger List View (< sm) */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {transactions.slice(0, 5).map((t) => {
              const isExpense = t.kind === "expense";
              return (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                        isExpense
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      }`}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 text-xs truncate">
                          {t.merchant || t.description}
                        </span>
                        {t.source === "nl" && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-medium bg-teal-50 text-teal-700 shrink-0"
                            title="Parsed with Natural Language"
                          >
                            <Sparkles className="w-2 h-2" />
                            NL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span className="truncate">{t.category_name || "General"}</span>
                        <span>•</span>
                        <span>{t.occurred_on}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-semibold text-xs tabular-nums whitespace-nowrap shrink-0">
                    <span className={isExpense ? "text-slate-900" : "text-emerald-600 font-bold"}>
                      {isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table (>= sm) */}
          <div className="hidden sm:block overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 font-semibold">Merchant / Note</th>
                  <th className="py-2.5 font-semibold">Category</th>
                  <th className="py-2.5 font-semibold">Date</th>
                  <th className="py-2.5 font-semibold">Type</th>
                  <th className="py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.slice(0, 5).map((t) => {
                  const isExpense = t.kind === "expense";
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Merchant / Description */}
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                              isExpense
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            }`}
                          >
                            {isExpense ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="truncate max-w-[180px]">
                            <span className="font-semibold text-slate-900 block truncate">
                              {t.merchant || t.description}
                            </span>
                            {t.merchant && t.description && t.merchant !== t.description && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {t.description}
                              </span>
                            )}
                          </div>
                          {t.source === "nl" && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-teal-50 text-teal-700 shrink-0"
                              title="Parsed with Natural Language"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>NL</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {t.category_name || "General"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {t.occurred_on}
                      </td>

                      {/* Transaction Type */}
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                            isExpense
                              ? "text-slate-600 bg-slate-100 border border-slate-200"
                              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
                          }`}
                        >
                          {isExpense ? "Expense" : "Income"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 text-right font-bold tabular-nums whitespace-nowrap">
                        <span className={isExpense ? "text-slate-900" : "text-emerald-600 font-bold"}>
                          {isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
