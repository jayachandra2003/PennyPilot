import React from "react";
import { ArrowRight, Plus, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { TransactionItem } from "../../lib/api";
import { formatINR } from "../../lib/currency";
import { CategoryGlassIcon } from "../common/GlassIcon";

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
    <div className="glass-panel p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden rounded-2xl h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3 sm:pb-4">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
            Recent Transactions
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onQuickAdd}
            className="btn-secondary text-xs px-3 py-1.5 min-h-[34px] hidden sm:inline-flex items-center gap-1 focus-ring"
            title="Add transaction"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={onViewAll}
            className="text-xs text-ledger-teal hover:text-ledger-tealHover font-medium flex items-center gap-1 focus-ring py-1 px-2.5 rounded-lg hover:bg-ledger-surfaceSubtle transition-colors"
          >
            <span>View All Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-10 space-y-3 bg-ledger-surfaceSubtle/50 rounded-lg border border-dashed border-ledger-border">
          <p className="text-xs text-ledger-inkMuted">No financial transactions recorded yet.</p>
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
          <div className="block sm:hidden divide-y divide-ledger-borderSubtle">
            {transactions.slice(0, 5).map((t) => {
              const isExpense = t.kind === "expense";
              return (
                <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryGlassIcon iconName={t.category_name} size="xs" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-ledger-ink text-xs truncate">
                          {t.merchant || t.description}
                        </span>
                        {t.source === "nl" && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-medium bg-ledger-tealLight text-ledger-teal shrink-0"
                            title="Parsed with Natural Language"
                          >
                            <Sparkles className="w-2 h-2" />
                            NL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-ledger-inkSubtle font-mono">
                        <span className="truncate">{t.category_name || "General"}</span>
                        <span>•</span>
                        <span>{t.occurred_on}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-serif font-bold text-xs tabular-nums whitespace-nowrap shrink-0">
                    <span className={isExpense ? "text-ledger-ink" : "text-emerald-700 font-bold"}>
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
                <tr className="border-b border-ledger-borderSubtle text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle">
                  <th className="py-2.5 font-medium">Merchant / Note</th>
                  <th className="py-2.5 font-medium">Category</th>
                  <th className="py-2.5 font-medium">Date</th>
                  <th className="py-2.5 font-medium">Type</th>
                  <th className="py-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-borderSubtle text-xs">
                {transactions.slice(0, 5).map((t) => {
                  const isExpense = t.kind === "expense";
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-ledger-surfaceHover/80 transition-colors group"
                    >
                      {/* Merchant / Description */}
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs font-semibold ${
                              isExpense
                                ? "bg-ledger-surfaceSubtle text-ledger-inkMuted border border-ledger-borderSubtle"
                                : "bg-ledger-sageLight text-ledger-sage border border-ledger-sage/20"
                            }`}
                          >
                            {isExpense ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="truncate max-w-[180px]">
                            <span className="font-medium text-ledger-ink block truncate">
                              {t.merchant || t.description}
                            </span>
                            {t.merchant && t.description && t.merchant !== t.description && (
                              <span className="text-[10px] text-ledger-inkSubtle block truncate">
                                {t.description}
                              </span>
                            )}
                          </div>
                          {t.source === "nl" && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-ledger-tealLight text-ledger-teal shrink-0"
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
                        <span className="badge-tag">
                          {t.category_name || "General"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-ledger-inkSubtle whitespace-nowrap">
                        {t.occurred_on}
                      </td>

                      {/* Transaction Type */}
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                            isExpense
                              ? "text-ledger-inkMuted bg-ledger-surfaceSubtle border border-ledger-borderSubtle"
                              : "text-ledger-sage bg-ledger-sageLight border border-ledger-sage/20"
                          }`}
                        >
                          {isExpense ? "Expense" : "Income"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 text-right font-serif font-bold text-xs tabular-nums whitespace-nowrap">
                        <span className={isExpense ? "text-ledger-ink" : "text-ledger-sage font-bold"}>
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
