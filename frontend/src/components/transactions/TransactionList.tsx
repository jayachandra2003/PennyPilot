import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Trash2,
  Edit2,
  Plus,
  Receipt,
  Sparkles,
  Download,
  X,
  Check,
} from "lucide-react";
import type { CategoryItem, TransactionItem } from "../../lib/api";
import { deleteTransaction, updateTransaction } from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";

interface TransactionListProps {
  transactions: TransactionItem[];
  categories: CategoryItem[];
  onOpenQuickAdd: () => void;
  isLoading: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  onOpenQuickAdd,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedKind, setSelectedKind] = useState("all");

  // Edit modal state
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCatId, setEditCatId] = useState("");
  const [editDate, setEditDate] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast("Transaction removed from active ledger", "info");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to delete transaction", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast("Transaction updated", "success");
      setEditingTx(null);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to update transaction", "error");
    },
  });

  const handleStartEdit = (tx: TransactionItem) => {
    setEditingTx(tx);
    setEditDesc(tx.description);
    setEditAmount(paiseToRupees(tx.amount_paise).toString());
    setEditCatId(tx.category_id);
    setEditDate(tx.occurred_on);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const paise = rupeesToPaise(Number(editAmount));
    if (!paise || paise <= 0) {
      toast("Please enter a valid amount", "error");
      return;
    }
    updateMutation.mutate({
      id: editingTx.id,
      data: {
        description: editDesc.trim(),
        amount_paise: paise,
        category_id: editCatId,
        occurred_on: editDate,
      },
    });
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast("No transactions to export", "info");
      return;
    }
    const headers = ["Date", "Description", "Category", "Type", "Amount (INR)", "Source"];
    const rows = filtered.map((t) => [
      t.occurred_on,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${(t.category_name || "General").replace(/"/g, '""')}"`,
      t.kind,
      paiseToRupees(t.amount_paise),
      t.source,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pennypilot_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Ledger exported as CSV", "success");
  };

  // Client-side filtering for sub-millisecond response
  const filtered = transactions.filter((t) => {
    if (selectedCat !== "all" && t.category_id !== selectedCat) return false;
    if (selectedKind !== "all" && t.kind !== selectedKind) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = (t.category_name || "").toLowerCase().includes(q);
      const matchMerchant = (t.merchant || "").toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchMerchant) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Action & Filter Header */}
      <div className="bg-ledger-surface p-5 md:p-6 rounded-2xl border border-ledger-border shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ledger-ink">Financial Ledger</h2>
            <p className="text-xs text-ledger-inkMuted">
              {filtered.length} transaction(s) recorded with integer paise precision
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-ledger-ink border border-ledger-border bg-ledger-bg hover:bg-ledger-surfaceSubtle transition-colors focus-ring"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onOpenQuickAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-ledger-teal text-white hover:bg-ledger-tealHover transition-colors shadow-sm focus-ring"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Add</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Input */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-ledger-inkSubtle" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description, merchant, or notes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-xs md:text-sm text-ledger-ink placeholder:text-ledger-inkSubtle focus-ring"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-xs md:text-sm text-ledger-ink focus-ring"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kind Filter */}
          <div>
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-xs md:text-sm text-ledger-ink focus-ring"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table / List */}
      <div className="bg-ledger-surface rounded-2xl border border-ledger-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-ledger-inkMuted animate-pulse">
            Loading ledger transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-ledger-tealLight text-ledger-teal flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-ledger-ink">No Transactions Found</h3>
            <p className="text-xs text-ledger-inkMuted max-w-sm mx-auto">
              {searchTerm || selectedCat !== "all"
                ? "Try clearing filters to see all recorded transactions."
                : "Your ledger is currently empty. Start recording expenses in natural language."}
            </p>
            <button
              onClick={onOpenQuickAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-ledger-teal text-white hover:bg-ledger-tealHover transition-colors focus-ring"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-ledger-bg border-b border-ledger-border text-ledger-inkMuted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-borderSubtle">
                {filtered.map((t) => {
                  const isExpense = t.kind === "expense";
                  return (
                    <tr key={t.id} className="hover:bg-ledger-surfaceSubtle transition-colors group">
                      <td className="py-3 px-4 text-ledger-inkSubtle whitespace-nowrap font-mono">
                        {t.occurred_on}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ledger-ink text-sm">{t.description}</div>
                        {t.nl_original_text && (
                          <div className="text-[10px] text-ledger-inkSubtle italic truncate max-w-xs">
                            "{t.nl_original_text}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-ledger-bg border border-ledger-border text-ledger-ink">
                          {t.category_name || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {t.source === "nl" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-ledger-tealLight text-ledger-teal">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Natural Language</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-ledger-inkSubtle">Manual</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        <span
                          className={`font-serif font-bold text-sm ${
                            isExpense ? "text-ledger-ink" : "text-ledger-sage"
                          }`}
                        >
                          {isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartEdit(t)}
                            title="Edit transaction"
                            className="p-1 rounded text-ledger-inkSubtle hover:text-ledger-teal focus-ring"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${t.description}" (${formatINR(t.amount_paise)})?`)) {
                                deleteMutation.mutate(t.id);
                              }
                            }}
                            title="Delete transaction"
                            className="p-1 rounded text-ledger-inkSubtle hover:text-ledger-red focus-ring"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Drawer / Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ledger-ink/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-ledger-surface max-w-md w-full rounded-2xl border border-ledger-border shadow-float p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ledger-border pb-3">
              <h3 className="font-serif text-lg font-bold text-ledger-ink">Edit Transaction</h3>
              <button
                onClick={() => setEditingTx(null)}
                className="text-ledger-inkSubtle hover:text-ledger-ink p-1 rounded focus-ring"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-sm text-ledger-ink focus-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-sm text-ledger-ink font-semibold tabular-nums focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-sm text-ledger-ink focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={editCatId}
                  onChange={(e) => setEditCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-sm text-ledger-ink focus-ring"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ledger-teal text-white text-xs font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring"
                >
                  <Check className="w-4 h-4" />
                  <span>{updateMutation.isPending ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
