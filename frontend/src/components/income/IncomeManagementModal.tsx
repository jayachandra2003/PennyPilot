import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Repeat,
  DollarSign,
  Briefcase,
  TrendingUp,
  PieChart,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategoryItem, IncomeRecord } from "../../lib/api";
import {
  fetchMonthlyIncome,
  createIncome,
  updateIncome,
  deleteIncome,
} from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";
import { GlassIcon } from "../common/GlassIcon";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface IncomeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  categories: CategoryItem[];
}

export const IncomeManagementModal: React.FC<IncomeManagementModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  categories,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItem, setEditingItem] = useState<IncomeRecord | null>(null);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  // Form State
  const [source, setSource] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [occurredOn, setOccurredOn] = useState(`${year}-${month.toString().padStart(2, "0")}-01`);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);

  // Income categories
  const incomeCategories = categories.filter((c) => c.kind === "income" && !c.is_archived);

  // Query income (monthly or yearly)
  const { data: incomeOverview, isLoading } = useQuery({
    queryKey: ["income", year, month, period],
    queryFn: () => fetchMonthlyIncome(year, month, period),
    enabled: isOpen,
  });

  const resetForm = () => {
    setSource("");
    setAmountRupees("");
    setOccurredOn(`${year}-${month.toString().padStart(2, "0")}-01`);
    setCategoryId(incomeCategories[0]?.id || "");
    setDescription("");
    setIsRecurring(true);
    setIsAddingNew(false);
    setEditingItem(null);
  };

  const handleStartEdit = (item: IncomeRecord) => {
    setEditingItem(item);
    setSource(item.source);
    setAmountRupees(paiseToRupees(item.amount_paise).toString());
    setOccurredOn(item.occurred_on);
    setCategoryId(item.category_id);
    setDescription(item.description);
    setIsRecurring(item.is_recurring);
    setIsAddingNew(true);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["financialPlan"] });
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      toast("Income source recorded successfully", "success");
      resetForm();
    },
    onError: (err: any) => {
      toast(err.message || "Failed to record income", "error");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateIncome(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["financialPlan"] });
      toast("Income record updated", "success");
      resetForm();
    },
    onError: (err: any) => {
      toast(err.message || "Failed to update income", "error");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["financialPlan"] });
      toast("Income record removed", "success");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to delete income", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amountRupees);
    if (!val || val <= 0) {
      toast("Please enter a valid income amount", "error");
      return;
    }
    if (!source.trim()) {
      toast("Please enter an income source name", "error");
      return;
    }

    const payload = {
      source: source.trim(),
      amount_paise: rupeesToPaise(val),
      occurred_on: occurredOn,
      category_id: categoryId || undefined,
      description: description.trim() || undefined,
      is_recurring: isRecurring,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  const totalIncome = incomeOverview?.total_income_paise || 0;
  const items = incomeOverview?.items || [];
  const breakdown = incomeOverview?.sources_breakdown || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 rounded-3xl shadow-modal overflow-hidden flex flex-col max-h-[90vh] text-ledger-ink">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#141F2E]/80">
          <div className="flex items-center gap-3">
            <GlassIcon icon={TrendingUp} variant="emerald" size="md" />
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
                {period === "yearly" ? "Yearly Income Management" : "Monthly Income Management"}
              </h2>
              <p className="text-xs text-ledger-inkSubtle">
                {period === "yearly" ? `Calendar Year ${year}` : `${MONTH_NAMES[month - 1]} ${year}`} • Actual earnings & source breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Period Toggle */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-white/10 p-1 rounded-xl border border-slate-300/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  period === "monthly"
                    ? "bg-white dark:bg-[#1E293B] text-ledger-ink shadow-xs border border-slate-200 dark:border-white/10"
                    : "text-ledger-inkSubtle hover:text-ledger-ink"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPeriod("yearly")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  period === "yearly"
                    ? "bg-white dark:bg-[#1E293B] text-ledger-ink shadow-xs border border-slate-200 dark:border-white/10"
                    : "text-ledger-inkSubtle hover:text-ledger-ink"
                }`}
              >
                Yearly
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ledger-inkSubtle hover:text-ledger-ink hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Total Inflow Telemetry Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-[#162232] border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ledger-inkSubtle block">
                {period === "yearly" ? `Actual Annual Income (${year})` : `Total Monthly Inflow (${MONTH_NAMES[month - 1]})`}
              </span>
              <span className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatINR(totalIncome)}
              </span>
              {period === "yearly" && incomeOverview?.projected_recurring_annual_paise && (
                <div className="mt-1 text-[11px] text-ledger-inkMuted font-mono">
                  Projected Recurring Annual:{" "}
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {incomeOverview.projected_recurring_annual_formatted}
                  </span>{" "}
                  <span className="text-[10px] text-ledger-inkSubtle">(from recurring rules)</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAddingNew ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddingNew(true);
                  }}
                  className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Income</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary py-2 px-3 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Breakdown Pills */}
          {breakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <span className="text-[10px] font-mono uppercase text-ledger-inkMuted flex items-center gap-1">
                <PieChart className="w-3 h-3" /> Sources:
              </span>
              {breakdown.map((b) => (
                <span
                  key={b.source}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 text-ledger-ink shadow-xs"
                >
                  <span className="font-semibold">{b.source}</span>
                  <span className="text-ledger-inkSubtle font-mono">{b.percentage}%</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white dark:bg-[#121C28]">
          {/* Add / Edit Form */}
          {isAddingNew && (
            <form
              onSubmit={handleSubmit}
              className="p-4 rounded-2xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 space-y-3.5 mb-4"
            >
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-ledger-teal flex items-center gap-1.5">
                {editingItem ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingItem ? "Edit Income Source" : "Record New Income"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ledger-inkSubtle block mb-1">
                    Income Source / Employer
                  </label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Acme Corp, Upwork, Dividend"
                    className="input-base w-full py-2 px-3 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-ledger-inkSubtle block mb-1">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-ledger-inkSubtle">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      placeholder="e.g. 75000"
                      className="input-base w-full pl-7 pr-3 py-2 text-xs sm:text-sm font-mono font-semibold tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-ledger-inkSubtle block mb-1">
                    Date Received
                  </label>
                  <input
                    type="date"
                    required
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    className="input-base w-full py-2 px-3 text-xs sm:text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-ledger-inkSubtle block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="input-base w-full py-2 px-3 text-xs sm:text-sm"
                  >
                    <option value="">Default (Auto-matched)</option>
                    {incomeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ledger-inkSubtle block mb-1">
                  Description / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. November Base Salary"
                  className="input-base w-full py-2 px-3 text-xs sm:text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-ledger-border text-ledger-teal focus:ring-ledger-teal"
                  />
                  <span className="text-xs font-medium text-ledger-ink flex items-center gap-1">
                    <Repeat className="w-3 h-3 text-ledger-teal" />
                    Recurring Monthly Inflow
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary py-1.5 px-3 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-primary py-1.5 px-4 text-xs font-semibold"
                  >
                    {editingItem ? "Save Changes" : "Save Income"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* List of Income Records */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-ledger-inkSubtle">
              Recorded Inflows ({items.length})
            </h3>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-ledger-inkMuted">
                Loading income records...
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-ledger-borderSubtle p-6">
                <Briefcase className="w-8 h-8 text-ledger-inkMuted mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-ledger-ink">No income recorded for this month</p>
                <p className="text-xs text-ledger-inkSubtle mt-1 mb-3">
                  Add your primary salary or additional earnings to unlock savings calculations.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Record First Income
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#182332] hover:bg-slate-100 dark:hover:bg-[#1E2B3D] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ledger-ink truncate">
                          {item.source}
                        </span>
                        {item.is_recurring && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-teal-500/10 text-ledger-teal border border-teal-500/20">
                            <Repeat className="w-2.5 h-2.5" /> Monthly
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ledger-inkSubtle font-mono mt-0.5">
                        <span>{item.category_name}</span>
                        <span>•</span>
                        <span>{item.occurred_on}</span>
                        {item.description && item.description !== item.source && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{item.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-serif text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{item.amount_formatted}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 rounded-lg text-ledger-inkSubtle hover:text-ledger-ink hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                        title="Edit record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete income record "${item.source}"?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-ledger-inkSubtle hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#141F2E]/80 flex items-center justify-between">
          <p className="text-[11px] text-ledger-inkSubtle">
            All income stored in integer paise. Budget ceilings are strictly separated from income.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary py-2 px-4 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
