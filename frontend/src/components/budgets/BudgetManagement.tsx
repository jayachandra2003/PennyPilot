import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
} from "lucide-react";
import type { CategoryBudgetStatus, MonthlyBudgetOverview } from "../../lib/api";
import { setMonthlyBudgets } from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";

interface BudgetManagementProps {
  year: number;
  month: number;
  overview?: MonthlyBudgetOverview;
  onMonthChange: (year: number, month: number) => void;
  isLoading: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const BudgetManagement: React.FC<BudgetManagementProps> = ({
  year,
  month,
  overview,
  onMonthChange,
  isLoading,
}) => {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editLimitRupees, setEditLimitRupees] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const monthStr = `${year}-${month.toString().padStart(2, "0")}-01`;
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const setBudgetMutation = useMutation({
    mutationFn: (budgets: Array<{ category_id?: string; limit_paise: number }>) =>
      setMonthlyBudgets(monthStr, budgets),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      toast("Category budget updated successfully", "success");
      setEditingCatId(null);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to update budget", "error");
    },
  });

  const handleStartEdit = (cat: CategoryBudgetStatus) => {
    setEditingCatId(cat.category_id);
    setEditLimitRupees(paiseToRupees(cat.limit_paise).toString());
  };

  const handleSaveBudget = (catId: string) => {
    const paise = rupeesToPaise(Number(editLimitRupees) || 0);
    setBudgetMutation.mutate([{ category_id: catId, limit_paise: paise }]);
  };

  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const totalLimit = overview?.total_limit_paise || 0;
  const totalSpent = overview?.total_spent_paise || 0;
  const remaining = overview?.remaining_paise || 0;
  const utilization = overview?.utilization_percent || 0;

  return (
    <div className="space-y-6">
      {/* Month Selector & Overview Header */}
      <div className="bg-ledger-surface p-6 md:p-8 rounded-2xl border border-ledger-border shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ledger-border pb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-ledger-bg border border-ledger-border rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1.5 rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs md:text-sm font-serif font-bold text-ledger-ink select-none">
                {monthLabel}
              </span>
              <button
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1.5 rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-ledger-inkSubtle">Monthly category limits</span>
          </div>

          <div className="text-xs font-semibold text-ledger-tealLight bg-ledger-teal px-3 py-1.5 rounded-xl">
            Strict Integer Paise Math
          </div>
        </div>

        {/* Aggregate Budget Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-ledger-bg border border-ledger-border space-y-1">
            <span className="text-xs font-semibold text-ledger-inkMuted uppercase">Overall Limit</span>
            <div className="font-serif text-2xl font-bold text-ledger-ink tabular-nums">
              {formatINR(totalLimit)}
            </div>
            <p className="text-[11px] text-ledger-inkSubtle">Sum of per-category budgets</p>
          </div>

          <div className="p-4 rounded-xl bg-ledger-bg border border-ledger-border space-y-1">
            <span className="text-xs font-semibold text-ledger-inkMuted uppercase">Month Spent</span>
            <div className="font-serif text-2xl font-bold text-ledger-ink tabular-nums">
              {formatINR(totalSpent)}
            </div>
            <p className="text-[11px] text-ledger-inkSubtle">{utilization}% of total budget used</p>
          </div>

          <div className="p-4 rounded-xl bg-ledger-bg border border-ledger-border space-y-1">
            <span className="text-xs font-semibold text-ledger-inkMuted uppercase">Remaining Buffer</span>
            <div className={`font-serif text-2xl font-bold tabular-nums ${remaining > 0 ? "text-ledger-sage" : "text-ledger-red"}`}>
              {formatINR(remaining)}
            </div>
            <p className="text-[11px] text-ledger-inkSubtle">{totalSpent > totalLimit ? "Over Budget" : "Under Limit"}</p>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs font-medium text-ledger-inkMuted">
            <span>Overall Budget Utilization</span>
            <span className="tabular-nums font-bold text-ledger-ink">{utilization}%</span>
          </div>
          <div className="w-full bg-ledger-borderSubtle h-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                utilization > 100
                  ? "bg-ledger-red"
                  : utilization > 80
                  ? "bg-ledger-amber"
                  : "bg-ledger-teal"
              }`}
              style={{ width: `${Math.min(100, Math.max(3, utilization))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Per-Category Budgets Grid */}
      <div className="bg-ledger-surface p-6 md:p-8 rounded-2xl border border-ledger-border shadow-card space-y-5">
        <div className="flex items-center justify-between border-b border-ledger-border pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-ledger-ink">
              Category Budgets & Spending Pace
            </h3>
            <p className="text-xs text-ledger-inkMuted">
              Click the edit icon on any category to set or adjust its monthly ceiling.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-ledger-inkMuted animate-pulse">
            Loading monthly category budgets...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview?.category_budgets.map((cat) => {
              const isEditing = editingCatId === cat.category_id;
              const hasBudget = cat.limit_paise > 0;
              const isOver = cat.status === "over_budget" || cat.status === "over_pace";
              const isCaution = cat.status === "caution";

              return (
                <div
                  key={cat.category_id}
                  className="p-4 rounded-xl border border-ledger-border bg-ledger-bg space-y-3 transition-colors hover:border-ledger-teal/40"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ledger-ink">{cat.category_name}</span>
                        {hasBudget && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isOver
                                ? "bg-ledger-redLight text-ledger-red border-ledger-red/30"
                                : isCaution
                                ? "bg-ledger-amberLight text-ledger-amber border-ledger-amber/30"
                                : "bg-ledger-sageLight text-ledger-sage border-ledger-sage/30"
                            }`}
                          >
                            {cat.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ledger-inkMuted mt-0.5">
                        Spent: <span className="font-bold text-ledger-ink tabular-nums">{cat.spent_formatted}</span>
                      </div>
                    </div>

                    {/* Inline Budget Editor */}
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="100"
                            value={editLimitRupees}
                            onChange={(e) => setEditLimitRupees(e.target.value)}
                            placeholder="Limit ₹"
                            className="w-24 px-2 py-1 rounded-lg border border-ledger-teal bg-ledger-surface text-xs font-semibold tabular-nums focus-ring"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveBudget(cat.category_id)}
                            className="p-1 rounded bg-ledger-teal text-white hover:bg-ledger-tealHover"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="p-1 rounded border border-ledger-border text-ledger-inkMuted hover:text-ledger-ink"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-serif font-bold text-ledger-ink tabular-nums">
                            {hasBudget ? cat.limit_formatted : "No Budget"}
                          </span>
                          <button
                            onClick={() => handleStartEdit(cat)}
                            className="p-1 rounded text-ledger-inkSubtle hover:text-ledger-teal focus-ring"
                            title="Edit budget limit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Progress Bar */}
                  {hasBudget ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-ledger-inkSubtle">
                        <span>{cat.utilization_percent}% used</span>
                        <span>{formatINR(cat.remaining_paise)} remaining</span>
                      </div>
                      <div className="w-full bg-ledger-borderSubtle h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            cat.utilization_percent > 100
                              ? "bg-ledger-red"
                              : cat.utilization_percent > 80
                              ? "bg-ledger-amber"
                              : "bg-ledger-teal"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, cat.utilization_percent))}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-ledger-inkSubtle italic">
                      Click edit to set a monthly ceiling for this category.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
