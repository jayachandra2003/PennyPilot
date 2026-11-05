import React from "react";
import { Receipt, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="bg-ledger-surface p-5 md:p-6 rounded-2xl border border-ledger-border shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-ledger-border pb-3">
        <div>
          <span className="text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider">
            Ledger Activity
          </span>
          <h3 className="font-serif text-lg font-bold text-ledger-ink">Recent Transactions</h3>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-ledger-teal hover:underline font-semibold flex items-center gap-1 focus-ring"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-xs text-ledger-inkMuted">No transactions recorded yet.</p>
          <button
            onClick={onQuickAdd}
            className="text-xs font-semibold text-ledger-teal hover:underline"
          >
            + Add your first expense
          </button>
        </div>
      ) : (
        <div className="divide-y divide-ledger-borderSubtle">
          {transactions.slice(0, 5).map((t) => {
            const isExpense = t.kind === "expense";
            return (
              <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-ledger-bg border border-ledger-border flex items-center justify-center text-ledger-inkMuted shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ledger-ink text-sm">{t.description}</span>
                      {t.source === "nl" && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-ledger-tealLight text-ledger-teal">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>NL</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-ledger-inkSubtle text-[11px] mt-0.5">
                      <span>{t.category_name || "General"}</span>
                      <span>•</span>
                      <span>{t.occurred_on}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right tabular-nums">
                  <span
                    className={`font-serif font-bold text-sm ${
                      isExpense ? "text-ledger-ink" : "text-ledger-sage"
                    }`}
                  >
                    {isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
