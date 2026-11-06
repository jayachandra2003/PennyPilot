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
    <div className="card-base p-5 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3">
        <div>
          <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
            Recent Activity
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
            Financial Ledger
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onQuickAdd}
            className="btn-secondary text-xs px-2.5 py-1 min-h-[30px] hidden sm:inline-flex items-center gap-1 focus-ring"
            title="Add transaction"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
          <button
            onClick={onViewAll}
            className="text-xs text-ledger-teal hover:text-ledger-tealHover font-medium flex items-center gap-1 focus-ring py-1 px-1.5 rounded"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-10 space-y-3 bg-ledger-surfaceSubtle rounded-md border border-dashed border-ledger-border">
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
        <div className="overflow-x-auto -mx-5 px-5 md:-mx-6 md:px-6">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-ledger-borderSubtle text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle">
                <th className="py-2 font-medium">Merchant / Note</th>
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium text-right">Amount</th>
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
                      <div className="flex items-center gap-2">
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
                            ? "text-ledger-inkMuted bg-ledger-surfaceSubtle"
                            : "text-ledger-sage bg-ledger-sageLight"
                        }`}
                      >
                        {isExpense ? "Expense" : "Income"}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                      <span className={isExpense ? "text-ledger-ink" : "text-ledger-sage"}>
                        {isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
