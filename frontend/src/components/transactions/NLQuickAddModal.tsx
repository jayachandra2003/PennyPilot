import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Check,
  ArrowRight,
} from "lucide-react";
import type { CategoryItem, ParsedDraftItem } from "../../lib/api";
import {
  bulkCreateTransactions,
  createTransaction,
  parseNaturalLanguage,
} from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";

interface NLQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
}

export const NLQuickAddModal: React.FC<NLQuickAddModalProps> = ({ isOpen, onClose, categories }) => {
  const [mode, setMode] = useState<"nl" | "manual">("nl");
  const [nlText, setNlText] = useState("");
  const [drafts, setDrafts] = useState<ParsedDraftItem[]>([]);
  const [isReviewed, setIsReviewed] = useState(false);

  // Manual form state
  const [manualAmount, setManualAmount] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCatId, setManualCatId] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualKind, setManualKind] = useState<"expense" | "income">("expense");

  const effectiveCatId = manualCatId || (categories.length > 0 ? categories[0].id : "");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Parse NL text mutation
  const parseMutation = useMutation({
    mutationFn: parseNaturalLanguage,
    onSuccess: (data) => {
      if (data.drafts.length === 0) {
        toast("No financial amounts detected. Try typing: '₹120 milk today'", "info");
        return;
      }
      // Match category IDs if missing
      const enrichedDrafts = data.drafts.map((d) => {
        let catId = d.category_id;
        if (!catId) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === d.category_name.toLowerCase()
          );
          catId = match ? match.id : categories[0]?.id;
        }
        return { ...d, category_id: catId };
      });
      setDrafts(enrichedDrafts);
      setIsReviewed(true);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to parse text", "error");
    },
  });

  // Save bulk drafts mutation
  const bulkSaveMutation = useMutation({
    mutationFn: bulkCreateTransactions,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast(`Successfully confirmed & saved ${saved.length} transaction(s) to ledger!`, "success");
      handleClose();
    },
    onError: (err: any) => {
      toast(err.message || "Bulk save failed", "error");
    },
  });

  // Manual save mutation
  const manualSaveMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast("Transaction recorded in ledger", "success");
      handleClose();
    },
    onError: (err: any) => {
      toast(err.message || "Failed to save transaction", "error");
    },
  });

  const handleClose = () => {
    setNlText("");
    setDrafts([]);
    setIsReviewed(false);
    setManualAmount("");
    setManualDesc("");
    onClose();
  };

  const handleParseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlText.trim()) return;
    parseMutation.mutate(nlText);
  };

  const handleUpdateDraft = (index: number, field: keyof ParsedDraftItem, value: any) => {
    setDrafts((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };
      if (field === "amount_rupees") {
        const paise = rupeesToPaise(Number(value) || 0);
        target.amount_paise = paise;
        target.formatted_amount = formatINR(paise);
      }
      next[index] = target;
      return next;
    });
  };

  const handleDeleteDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    if (drafts.length <= 1) {
      setIsReviewed(false);
    }
  };

  const handleConfirmBulkSave = () => {
    if (drafts.length === 0) return;
    const payload = drafts.map((d) => ({
      category_id: d.category_id || categories[0].id,
      kind: d.kind,
      amount_paise: d.amount_paise,
      occurred_on: d.occurred_on,
      description: d.description,
      source: "nl" as const,
      nl_original_text: d.nl_original_text,
    }));
    bulkSaveMutation.mutate(payload);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(Number(manualAmount));
    if (!paise || paise <= 0) {
      toast("Please enter a valid amount in Rupees", "error");
      return;
    }
    if (!manualDesc.trim()) {
      toast("Please enter a description", "error");
      return;
    }
    manualSaveMutation.mutate({
      category_id: effectiveCatId,
      kind: manualKind,
      amount_paise: paise,
      occurred_on: manualDate,
      description: manualDesc.trim(),
      source: "manual",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ledger-ink/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-ledger-surface max-w-2xl w-full rounded-2xl border border-ledger-border shadow-float overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Mode Toggle */}
        <div className="flex items-center justify-between p-5 border-b border-ledger-border bg-ledger-surfaceSubtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ledger-tealLight text-ledger-teal flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-ledger-ink">Record Transaction</h2>
              <p className="text-xs text-ledger-inkMuted">Natural Language Parsing with Review-Before-Save</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-ledger-bg p-0.5 rounded-lg border border-ledger-border text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode("nl")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  mode === "nl" ? "bg-ledger-surface text-ledger-teal font-semibold shadow-hairline" : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                Natural Language
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  mode === "manual" ? "bg-ledger-surface text-ledger-teal font-semibold shadow-hairline" : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                Manual Form
              </button>
            </div>

            <button
              onClick={handleClose}
              className="text-ledger-inkSubtle hover:text-ledger-ink p-1 rounded-lg focus-ring"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {mode === "nl" ? (
            <>
              {/* Natural Language Prompt Input */}
              {!isReviewed ? (
                <form onSubmit={handleParseSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1.5">
                      Type what you spent in plain Indian English
                    </label>
                    <textarea
                      value={nlText}
                      onChange={(e) => setNlText(e.target.value)}
                      placeholder="e.g. ₹120 milk and ₹450 groceries today, auto 80 yesterday"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink placeholder:text-ledger-inkSubtle focus-ring resize-none text-sm leading-relaxed"
                      autoFocus
                    />
                  </div>

                  {/* Quick Examples */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-ledger-inkSubtle font-medium">Try clicking an example:</span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        "₹120 milk and ₹450 groceries today, auto 80 yesterday",
                        "Swiggy 380 dinner last night",
                        "1.5k shopping at Zara",
                        "Rs 2500 wifi bill today",
                      ].map((ex) => (
                        <button
                          type="button"
                          key={ex}
                          onClick={() => setNlText(ex)}
                          className="px-2.5 py-1 rounded-lg bg-ledger-bg border border-ledger-border hover:border-ledger-teal/50 text-ledger-inkMuted hover:text-ledger-ink transition-colors text-left"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!nlText.trim() || parseMutation.isPending}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ledger-teal text-white text-sm font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring"
                    >
                      {parseMutation.isPending ? "Parsing..." : "Parse & Review"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                /* Review-Before-Save Drafts Table */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ledger-ink">
                        Review Parsed Drafts ({drafts.length})
                      </h3>
                      <p className="text-xs text-ledger-inkMuted">
                        Verify and edit items before committing to the ledger.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReviewed(false)}
                      className="text-xs text-ledger-teal hover:underline font-medium"
                    >
                      ← Re-edit text
                    </button>
                  </div>

                  <div className="border border-ledger-border rounded-xl overflow-hidden bg-ledger-surface">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-ledger-bg border-b border-ledger-border text-ledger-inkMuted uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Amount (₹)</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ledger-border">
                        {drafts.map((draft, idx) => (
                          <tr key={idx} className="hover:bg-ledger-surfaceSubtle transition-colors">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={draft.description}
                                onChange={(e) => handleUpdateDraft(idx, "description", e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-ledger-border focus:border-ledger-teal px-1 py-0.5 focus-ring rounded"
                              />
                              {draft.needs_review && (
                                <span className="inline-block mt-0.5 text-[10px] text-ledger-amber font-semibold">
                                  ⚠ Review category
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 w-28">
                              <div className="relative">
                                <span className="absolute left-1.5 top-1 text-ledger-inkSubtle">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={draft.amount_rupees || paiseToRupees(draft.amount_paise)}
                                  onChange={(e) => handleUpdateDraft(idx, "amount_rupees", e.target.value)}
                                  className="w-full pl-5 pr-1 py-0.5 bg-transparent border-b border-transparent hover:border-ledger-border focus:border-ledger-teal tabular-nums font-semibold focus-ring rounded"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 w-36">
                              <select
                                value={draft.category_id}
                                onChange={(e) => {
                                  const selectedCat = categories.find((c) => c.id === e.target.value);
                                  handleUpdateDraft(idx, "category_id", e.target.value);
                                  if (selectedCat) {
                                    handleUpdateDraft(idx, "category_name", selectedCat.name);
                                    handleUpdateDraft(idx, "needs_review", false);
                                  }
                                }}
                                className="w-full bg-transparent border border-ledger-border rounded px-1.5 py-1 text-xs focus-ring"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 w-32">
                              <input
                                type="date"
                                value={draft.occurred_on}
                                onChange={(e) => handleUpdateDraft(idx, "occurred_on", e.target.value)}
                                className="w-full bg-transparent border border-ledger-border rounded px-1 py-0.5 text-xs focus-ring"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(idx)}
                                className="text-ledger-inkSubtle hover:text-ledger-red p-1 rounded focus-ring"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-ledger-inkMuted">
                      Total:{" "}
                      <span className="font-serif font-bold text-ledger-ink text-sm tabular-nums">
                        {formatINR(drafts.reduce((sum, d) => sum + d.amount_paise, 0))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border focus-ring"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmBulkSave}
                        disabled={bulkSaveMutation.isPending || drafts.length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ledger-teal text-white text-xs font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring"
                      >
                        <Check className="w-4 h-4" />
                        <span>{bulkSaveMutation.isPending ? "Saving..." : `Confirm & Add (${drafts.length})`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Manual Form */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-ledger-inkSubtle text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      placeholder="e.g. 450.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink font-semibold tabular-nums focus-ring text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Type
                  </label>
                  <select
                    value={manualKind}
                    onChange={(e) => setManualKind(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="e.g. Organic Milk and Eggs"
                  className="w-full px-4 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={manualCatId}
                    onChange={(e) => setManualCatId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.kind})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualSaveMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ledger-teal text-white text-xs font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring"
                >
                  <Plus className="w-4 h-4" />
                  <span>{manualSaveMutation.isPending ? "Recording..." : "Record Transaction"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
