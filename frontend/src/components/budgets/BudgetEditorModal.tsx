import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CategoryItem, MonthlyBudgetOverview } from "../../lib/api";
import { setMonthlyBudgets, fetchMonthlyIncome } from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";
import { CategoryGlassIcon, GlassIcon } from "../common/GlassIcon";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface BudgetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  overview?: MonthlyBudgetOverview;
  categories: CategoryItem[];
  monthlyIncomePaise?: number;
  onNavigateToBudgetsPage?: () => void;
}

export const BudgetEditorModal: React.FC<BudgetEditorModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  overview,
  categories,
  monthlyIncomePaise,
  onNavigateToBudgetsPage,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Active expense categories only
  const expenseCategories = categories.filter(
    (c) => c.kind === "expense" && !c.is_archived
  );

  // Income overview if monthlyIncomePaise not provided
  const { data: incomeOverview } = useQuery({
    queryKey: ["income", year, month],
    queryFn: () => fetchMonthlyIncome(year, month),
    enabled: isOpen && monthlyIncomePaise === undefined,
  });

  const effectiveIncomePaise =
    monthlyIncomePaise !== undefined
      ? monthlyIncomePaise
      : incomeOverview?.total_income_paise || 0;

  // Map of category_id -> rupee string value
  const [limits, setLimits] = useState<Record<string, string>>({});

  // Sync state whenever modal opens or overview changes
  useEffect(() => {
    if (!isOpen) return;
    const initialLimits: Record<string, string> = {};
    const catBudgets = overview?.category_budgets || [];
    const budgetMap = new Map(catBudgets.map((b) => [b.category_id, b.limit_paise]));

    for (const cat of expenseCategories) {
      const limitPaise = budgetMap.get(cat.id) || 0;
      initialLimits[cat.id] = limitPaise > 0 ? paiseToRupees(limitPaise).toString() : "";
    }
    setLimits(initialLimits);
  }, [isOpen, overview, categories]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Derived calculations
  const monthStr = `${year}-${month.toString().padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Calculate live total limit in paise from current input values
  const liveTotalLimitPaise = Object.values(limits).reduce((sum, val) => {
    const rupees = Number(val);
    if (!isNaN(rupees) && rupees > 0) {
      return sum + rupeesToPaise(rupees);
    }
    return sum;
  }, 0);

  const totalSpentPaise = overview?.total_spent_paise || 0;
  const liveRemainingBufferPaise = Math.max(0, liveTotalLimitPaise - totalSpentPaise);
  const liveDailyPacePaise = daysInMonth > 0 ? Math.round(liveTotalLimitPaise / daysInMonth) : 0;

  const mutation = useMutation({
    mutationFn: (budgetsPayload: Array<{ category_id?: string; limit_paise: number }>) =>
      setMonthlyBudgets(monthStr, budgetsPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      toast("Monthly budget allocations updated successfully", "success");
      onClose();
    },
    onError: (err: any) => {
      toast(err.message || "Failed to update budget allocations", "error");
    },
  });

  const handleInputChange = (catId: string, value: string) => {
    setLimits((prev) => ({ ...prev, [catId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Array<{ category_id: string; limit_paise: number }> = [];
    for (const cat of expenseCategories) {
      const rawVal = limits[cat.id] || "";
      const rupees = Number(rawVal.trim());
      const limitPaise = !isNaN(rupees) && rupees > 0 ? rupeesToPaise(rupees) : 0;
      payload.push({
        category_id: cat.id,
        limit_paise: limitPaise,
      });
    }

    mutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-editor-title"
    >
      <div className="bg-white dark:bg-[#141F2E] border border-slate-200 dark:border-white/15 max-w-xl w-full rounded-3xl shadow-float overflow-hidden flex flex-col max-h-[90vh] text-ledger-ink">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-ledger-borderSubtle flex items-center justify-between bg-ledger-surfaceSubtle/40">
          <div className="flex items-center gap-3">
            <GlassIcon icon={SlidersHorizontal} variant="teal" size="sm" />
            <div>
              <h2 id="budget-editor-title" className="font-serif text-lg sm:text-xl font-bold">
                Modify Budget Allocations
              </h2>
              <p className="text-xs text-ledger-inkMuted">
                Set monthly spending limits for {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ledger-inkSubtle hover:text-ledger-ink hover:bg-ledger-surface transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Derived Telemetry Banner */}
        <div className="p-4 sm:p-5 bg-ledger-surfaceSubtle/60 border-b border-ledger-borderSubtle">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-ledger-surface border border-ledger-borderSubtle">
              <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block truncate">
                Monthly Ceiling
              </span>
              <span className="font-serif text-sm sm:text-base font-bold text-ledger-ink tabular-nums block truncate">
                {formatINR(liveTotalLimitPaise)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-ledger-surface border border-ledger-borderSubtle">
              <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block truncate">
                Remaining Buffer
              </span>
              <span
                className={`font-serif text-sm sm:text-base font-bold tabular-nums block truncate ${
                  liveTotalLimitPaise > 0 && liveRemainingBufferPaise === 0
                    ? "text-ledger-red"
                    : "text-ledger-teal"
                }`}
              >
                {formatINR(liveRemainingBufferPaise)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-ledger-surface border border-ledger-borderSubtle">
              <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block truncate">
                Daily Pace Limit
              </span>
              <span className="font-serif text-sm sm:text-base font-bold text-ledger-ink tabular-nums block truncate">
                {liveTotalLimitPaise > 0 ? `${formatINR(liveDailyPacePaise)}/d` : "None"}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-ledger-surface border border-ledger-borderSubtle">
              <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block truncate">
                Planned Cushion
              </span>
              <span
                className={`font-serif text-sm sm:text-base font-bold tabular-nums block truncate ${
                  effectiveIncomePaise > 0
                    ? effectiveIncomePaise >= liveTotalLimitPaise
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-500"
                    : "text-ledger-inkSubtle"
                }`}
              >
                {effectiveIncomePaise > 0
                  ? formatINR(effectiveIncomePaise - liveTotalLimitPaise)
                  : "No Inflow"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-ledger-inkSubtle text-center mt-2.5 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-ledger-teal shrink-0" />
            <span>
              {effectiveIncomePaise > 0
                ? `Planned savings: ${formatINR(Math.max(0, effectiveIncomePaise - liveTotalLimitPaise))} based on ${formatINR(effectiveIncomePaise)} monthly inflow.`
                : "Updates in real time and recalculated deterministically in integer paise."}
            </span>
          </p>
        </div>

        {/* Category Budget Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5">
          {expenseCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-ledger-inkMuted">
              No active expense categories found.
            </div>
          ) : (
            expenseCategories.map((cat) => {
              const currentVal = limits[cat.id] || "";
              const spentPaise =
                overview?.category_budgets?.find((b) => b.category_id === cat.id)?.spent_paise || 0;

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-ledger-borderSubtle bg-ledger-surface hover:bg-ledger-surfaceSubtle transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryGlassIcon
                      iconName={cat.icon}
                      colorToken={cat.color_token}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-ledger-ink block truncate">
                        {cat.name}
                      </span>
                      <span className="text-[11px] text-ledger-inkSubtle font-mono block truncate">
                        Spent: {formatINR(spentPaise)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-ledger-inkSubtle pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={currentVal}
                        onChange={(e) => handleInputChange(cat.id, e.target.value)}
                        placeholder="0"
                        className="input-base w-28 sm:w-36 pl-7 pr-3 py-1.5 text-xs sm:text-sm font-mono font-semibold tabular-nums text-right"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div className="pt-2">
            <div className="p-3 rounded-xl bg-ledger-tealLight/50 border border-ledger-teal/20 text-xs text-ledger-ink flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-ledger-teal shrink-0 mt-0.5" />
              <span>
                Saving will store each category allocation in the database and immediately refresh your
                Dashboard Budget Buffer, velocity charts, and pacing signals.
              </span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-ledger-borderSubtle bg-ledger-surfaceSubtle/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          {onNavigateToBudgetsPage ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToBudgetsPage();
              }}
              className="text-xs text-ledger-teal hover:text-ledger-tealHover font-medium flex items-center gap-1 cursor-pointer order-2 sm:order-1"
            >
              <span>View Full Budgets Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="order-2 sm:order-1" />
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end order-1 sm:order-2">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="btn-secondary text-xs sm:text-sm px-4 py-2 min-h-[40px] flex-1 sm:flex-initial"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="btn-primary text-xs sm:text-sm px-5 py-2 min-h-[40px] flex-1 sm:flex-initial"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{mutation.isPending ? "Saving..." : "Save Allocations"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
