import React, { useState, useMemo } from "react";
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
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
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

const PAGE_SIZE = 15;

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  onOpenQuickAdd,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [selectedKind, setSelectedKind] = useState<"all" | "expense" | "income">("all");
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleDelete = (tx: TransactionItem) => {
    if (window.confirm(`Delete "${tx.merchant || tx.description}" (${formatINR(tx.amount_paise)})?`)) {
      deleteMutation.mutate(tx.id);
    }
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
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
  }, [transactions, selectedCat, selectedKind, searchTerm]);

  // Reset page when filters change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleCatChange = (val: string) => {
    setSelectedCat(val);
    setCurrentPage(1);
  };

  const handleKindChange = (val: "all" | "expense" | "income") => {
    setSelectedKind(val);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCat("all");
    setSelectedKind("all");
    setCurrentPage(1);
  };

  const isFiltered = searchTerm.trim() !== "" || selectedCat !== "all" || selectedKind !== "all";

  // Summary telemetry metrics
  const totalCount = transactions.length;
  const filteredCount = filtered.length;

  const totalInflowPaise = useMemo(
    () => transactions.filter((t) => t.kind === "income").reduce((sum, t) => sum + t.amount_paise, 0),
    [transactions]
  );
  const totalOutflowPaise = useMemo(
    () => transactions.filter((t) => t.kind === "expense").reduce((sum, t) => sum + t.amount_paise, 0),
    [transactions]
  );

  const filteredInflowPaise = useMemo(
    () => filtered.filter((t) => t.kind === "income").reduce((sum, t) => sum + t.amount_paise, 0),
    [filtered]
  );
  const filteredOutflowPaise = useMemo(
    () => filtered.filter((t) => t.kind === "expense").reduce((sum, t) => sum + t.amount_paise, 0),
    [filtered]
  );

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast("No transactions to export", "info");
      return;
    }
    const headers = ["Date", "Description", "Merchant", "Category", "Type", "Amount (INR)", "Source"];
    const rows = filtered.map((t) => [
      t.occurred_on,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${(t.merchant || "").replace(/"/g, '""')}"`,
      `"${(t.category_name || "General").replace(/"/g, '""')}"`,
      t.kind,
      paiseToRupees(t.amount_paise),
      t.source,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().split("T")[0];
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pennypilot_ledger_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Ledger exported as CSV", "success");
  };

  return (
    <div className="space-y-5 md:space-y-6 min-w-0">
      {/* 1. Header & Actions Bar */}
      <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-ledger-borderSubtle pb-4 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
                Audit Trail
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-ledger-ink tracking-tight">
              Financial Ledger
            </h2>
            <p className="text-xs text-ledger-inkMuted mt-0.5">
              Auditable double-entry records calculated with integer paise precision.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="btn-secondary text-xs sm:text-sm px-3 py-1.5 min-h-[36px] focus-ring"
              title="Export current view to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onOpenQuickAdd}
              className="btn-primary text-xs sm:text-sm px-3.5 py-1.5 min-h-[36px] focus-ring"
              title="Record transaction with natural language"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
            </button>
          </div>
        </div>

        {/* 2. Three Compact Transaction Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 min-w-0 pt-1">
          {/* Metric 1: Count */}
          <div className="card-base p-4 sm:p-4.5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
                Transaction Volume
              </span>
              <div className="w-7 h-7 rounded-md bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center border border-ledger-border shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 my-2 min-w-0">
              <div className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums break-words">
                {filteredCount} <span className="font-sans font-normal text-xs sm:text-sm text-ledger-inkMuted">entries</span>
              </div>
              <div className="text-[11px] text-ledger-inkSubtle truncate">
                {isFiltered
                  ? `Showing ${filteredCount} of ${totalCount} recorded`
                  : `${totalCount} total in active ledger`}
              </div>
            </div>
          </div>

          {/* Metric 2: Inflow */}
          <div className="card-base p-4 sm:p-4.5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
                Total Inflow
              </span>
              <div className="w-7 h-7 rounded-md bg-ledger-sageLight text-ledger-sage flex items-center justify-center border border-ledger-sage/20 shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 my-2 min-w-0">
              <div className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-ledger-sage tracking-tight tabular-nums break-words">
                {formatINR(filteredInflowPaise)}
              </div>
              <div className="text-[11px] text-ledger-inkSubtle truncate">
                {isFiltered
                  ? `Filtered from ${formatINR(totalInflowPaise)} total`
                  : "Salary, dividends & deposits"}
              </div>
            </div>
          </div>

          {/* Metric 3: Outflow */}
          <div className="card-base p-4 sm:p-4.5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ledger-inkMuted uppercase tracking-wider">
                Total Outflow
              </span>
              <div className="w-7 h-7 rounded-md bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center border border-ledger-border shrink-0">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1 my-2 min-w-0">
              <div className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums break-words">
                {formatINR(filteredOutflowPaise)}
              </div>
              <div className="text-[11px] text-ledger-inkSubtle truncate">
                {isFiltered
                  ? `Filtered from ${formatINR(totalOutflowPaise)} total`
                  : "Total expenses & debits"}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Search and Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 min-w-0">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-ledger-inkSubtle" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search description, merchant, or notes..."
              className="input-base pl-9 pr-8 text-xs sm:text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-2.5 text-ledger-inkSubtle hover:text-ledger-ink p-0.5 rounded focus-ring"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Segmented Control */}
          <div className="inline-flex items-center bg-ledger-surfaceSubtle border border-ledger-border rounded-md p-0.5 shrink-0 select-none">
            {(["all", "expense", "income"] as const).map((kind) => {
              const isActive = selectedKind === kind;
              const label = kind === "all" ? "All" : kind === "expense" ? "Expenses" : "Income";
              return (
                <button
                  key={kind}
                  onClick={() => handleKindChange(kind)}
                  className={`px-2.5 sm:px-3 py-1 rounded text-xs font-medium transition-all ${
                    isActive
                      ? "bg-ledger-ink text-white shadow-hairline"
                      : "text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surface"
                  } focus-ring`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Category Dropdown */}
          <div className="shrink-0 min-w-[140px]">
            <select
              value={selectedCat}
              onChange={(e) => handleCatChange(e.target.value)}
              className="input-base text-xs sm:text-sm py-1.5"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs text-ledger-teal hover:text-ledger-tealHover font-medium px-2 py-1 rounded focus-ring shrink-0 self-center"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Ledger Content: Desktop Table & Mobile List */}
      <div className="card-base p-0 overflow-hidden min-w-0">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-ledger-inkMuted animate-pulse">
            Loading ledger transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 sm:p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-lg bg-ledger-surfaceSubtle text-ledger-inkMuted border border-ledger-border flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-ledger-ink">No Transactions Found</h3>
            <p className="text-xs text-ledger-inkMuted max-w-sm mx-auto">
              {isFiltered
                ? "No entries match your search and filter criteria. Try resetting filters."
                : "Your ledger is currently empty. Record your first transaction to establish the audit trail."}
            </p>
            {isFiltered ? (
              <button
                onClick={resetFilters}
                className="btn-secondary text-xs focus-ring"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                onClick={onOpenQuickAdd}
                className="btn-primary text-xs focus-ring"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record First Transaction</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 4A. Desktop Table (>= 768px / md:block) */}
            <div className="hidden md:block overflow-x-auto max-w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-ledger-borderSubtle bg-ledger-surfaceSubtle text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle">
                    <th className="py-2.5 px-4 font-medium w-[110px]">Date</th>
                    <th className="py-2.5 px-4 font-medium">Merchant / Description</th>
                    <th className="py-2.5 px-4 font-medium w-[150px]">Category</th>
                    <th className="py-2.5 px-4 font-medium w-[100px]">Type</th>
                    <th className="py-2.5 px-4 font-medium text-right w-[140px]">Amount</th>
                    <th className="py-2.5 px-4 font-medium text-right w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ledger-borderSubtle text-xs">
                  {paginatedTransactions.map((t) => {
                    const isExpense = t.kind === "expense";
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-ledger-surfaceHover/80 transition-colors group"
                      >
                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-ledger-inkSubtle whitespace-nowrap">
                          {t.occurred_on}
                        </td>

                        {/* Merchant / Description */}
                        <td className="py-3 px-4">
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
                            <div className="truncate max-w-[280px] lg:max-w-[340px]">
                              <span className="font-medium text-ledger-ink text-sm block truncate">
                                {t.merchant || t.description}
                              </span>
                              {t.merchant && t.description && t.merchant !== t.description && (
                                <span className="text-[11px] text-ledger-inkSubtle block truncate">
                                  {t.description}
                                </span>
                              )}
                            </div>
                            {t.source === "nl" && (
                              <span
                                className="badge-tag ml-1"
                                title="Parsed with Natural Language"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-ledger-teal" />
                                <span>NL</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="badge-tag">
                            {t.category_name || "General"}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 text-right font-mono font-semibold text-sm tabular-nums whitespace-nowrap">
                          <span className={isExpense ? "text-ledger-ink" : "text-ledger-sage"}>
                            {isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(t)}
                              title="Edit transaction"
                              aria-label={`Edit ${t.merchant || t.description}`}
                              className="p-1.5 rounded hover:bg-ledger-surface text-ledger-inkSubtle hover:text-ledger-teal transition-colors focus-ring"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              title="Delete transaction"
                              aria-label={`Delete ${t.merchant || t.description}`}
                              className="p-1.5 rounded hover:bg-ledger-surface text-ledger-inkSubtle hover:text-ledger-red transition-colors focus-ring"
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

            {/* 4B. Mobile Ledger List (< 768px / block md:hidden, strictly zero overflow) */}
            <div className="block md:hidden divide-y divide-ledger-borderSubtle">
              {paginatedTransactions.map((t) => {
                const isExpense = t.kind === "expense";
                return (
                  <div
                    key={t.id}
                    className="p-3.5 sm:p-4 hover:bg-ledger-surfaceHover/50 transition-colors flex flex-col gap-2 min-w-0"
                  >
                    {/* Top Row: Icon + Title + Amount */}
                    <div className="flex items-start justify-between gap-2.5 min-w-0">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5 ${
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
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-ledger-ink text-sm truncate">
                              {t.merchant || t.description}
                            </span>
                            {t.source === "nl" && (
                              <span
                                className="badge-tag shrink-0"
                                title="Parsed with Natural Language"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-ledger-teal" />
                                <span>NL</span>
                              </span>
                            )}
                          </div>
                          {t.merchant && t.description && t.merchant !== t.description && (
                            <span className="text-[11px] text-ledger-inkSubtle block truncate">
                              {t.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono font-semibold text-sm tabular-nums whitespace-nowrap shrink-0">
                        <span className={isExpense ? "text-ledger-ink" : "text-ledger-sage"}>
                          {isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Metadata & Accessible 44px Action Targets */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-ledger-borderSubtle/60 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="badge-tag truncate">
                          {t.category_name || "General"}
                        </span>
                        <span className="text-ledger-inkSubtle text-[11px] font-mono shrink-0">
                          {t.occurred_on}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(t)}
                          aria-label={`Edit ${t.merchant || t.description}`}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-ledger-inkSubtle hover:text-ledger-teal active:bg-ledger-surfaceSubtle transition-colors focus-ring"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          aria-label={`Delete ${t.merchant || t.description}`}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-ledger-inkSubtle hover:text-ledger-red active:bg-ledger-surfaceSubtle transition-colors focus-ring"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 5. Pagination Bar */}
            <div className="px-4 py-3 sm:px-6 bg-ledger-surfaceSubtle/60 border-t border-ledger-borderSubtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ledger-inkMuted">
              <span className="font-mono text-[11px] text-ledger-inkSubtle">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} entries
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary text-xs px-2.5 py-1 min-h-[32px] disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    <span>Previous</span>
                  </button>

                  <span className="px-2 font-mono text-[11px] text-ledger-ink font-semibold">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary text-xs px-2.5 py-1 min-h-[32px] disabled:opacity-40 disabled:cursor-not-allowed focus-ring"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 6. Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ledger-ink/40 backdrop-blur-sm animate-fade-in">
          <div className="card-base p-5 sm:p-6 shadow-modal max-w-md w-full rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
                  Modify Entry
                </span>
                <h3 className="font-serif text-lg font-bold text-ledger-ink">Edit Transaction</h3>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="text-ledger-inkSubtle hover:text-ledger-ink p-1.5 rounded focus-ring"
                aria-label="Close edit dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1.5">
                  Description / Merchant
                </label>
                <input
                  type="text"
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="input-base text-sm"
                  placeholder="e.g. D-Mart Groceries"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="input-base text-sm font-mono font-semibold tabular-nums"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="input-base text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={editCatId}
                  onChange={(e) => setEditCatId(e.target.value)}
                  className="input-base text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-ledger-borderSubtle">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="btn-secondary text-xs sm:text-sm px-3.5 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary text-xs sm:text-sm px-4 py-2"
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
