import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
  Target,
  ArrowDownRight,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Home,
  Banknote,
  Briefcase,
  HeartPulse,
  Film,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type { CategoryBudgetStatus, MonthlyBudgetOverview } from "../../lib/api";
import { fetchBudgetPace, setMonthlyBudgets } from "../../lib/api";
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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "shopping-cart": ShoppingCart,
  cart: ShoppingCart,
  utensils: Utensils,
  dining: Utensils,
  car: Car,
  transportation: Car,
  zap: Zap,
  utilities: Zap,
  home: Home,
  housing: Home,
  banknote: Banknote,
  salary: Banknote,
  briefcase: Briefcase,
  freelance: Briefcase,
  "heart-pulse": HeartPulse,
  healthcare: HeartPulse,
  film: Film,
  entertainment: Film,
  "shopping-bag": ShoppingBag,
  shopping: ShoppingBag,
};

export const BudgetManagement: React.FC<BudgetManagementProps> = ({
  year,
  month,
  overview,
  onMonthChange,
  isLoading,
}) => {
  const [editingCat, setEditingCat] = useState<CategoryBudgetStatus | null>(null);
  const [editLimitRupees, setEditLimitRupees] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "budgeted" | "attention" | "unbudgeted">("all");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch or reuse existing budget pace calculation
  const { data: pace } = useQuery({
    queryKey: ["budgetPace", year, month],
    queryFn: () => fetchBudgetPace(year, month),
  });

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
      setEditingCat(null);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to update budget", "error");
    },
  });

  const handleStartEdit = (cat: CategoryBudgetStatus) => {
    setEditingCat(cat);
    setEditLimitRupees(cat.limit_paise > 0 ? paiseToRupees(cat.limit_paise).toString() : "");
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    const rupees = Number(editLimitRupees);
    if (isNaN(rupees) || rupees < 0) {
      toast("Please enter a valid non-negative amount", "error");
      return;
    }
    const paise = rupeesToPaise(rupees);
    setBudgetMutation.mutate([{ category_id: editingCat.category_id, limit_paise: paise }]);
  };

  const handleRemoveBudget = () => {
    if (!editingCat) return;
    setBudgetMutation.mutate([{ category_id: editingCat.category_id, limit_paise: 0 }]);
  };

  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  // Metrics from verified backend overview
  const totalLimit = overview?.total_limit_paise || 0;
  const totalSpent = overview?.total_spent_paise || 0;
  const remaining = overview?.remaining_paise || 0;
  const utilization = overview?.utilization_percent || 0;
  const categoryBudgets = useMemo(() => overview?.category_budgets || [], [overview?.category_budgets]);

  const budgetedCount = categoryBudgets.filter((c) => c.limit_paise > 0).length;
  const attentionCount = categoryBudgets.filter(
    (c) => c.limit_paise > 0 && (c.status === "over_pace" || c.status === "over_budget" || c.status === "caution")
  ).length;

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categoryBudgets.filter((c) => {
      if (filterMode === "budgeted") return c.limit_paise > 0;
      if (filterMode === "unbudgeted") return c.limit_paise === 0;
      if (filterMode === "attention") {
        return c.limit_paise > 0 && (c.status === "over_pace" || c.status === "over_budget" || c.status === "caution");
      }
      return true;
    });
  }, [categoryBudgets, filterMode]);

  // Pacing calculations from backend
  const elapsedDays = pace?.elapsed_days ?? 1;
  const totalDays = pace?.total_days ?? 30;
  const scheduledPercent = Math.min(100, Math.max(1, Math.round((elapsedDays / Math.max(1, totalDays)) * 100)));
  const paceStatus = pace?.status ?? "on_track";

  const getPaceStatusBadge = (status: string) => {
    switch (status) {
      case "on_track":
        return {
          label: "On Track",
          className: "bg-ledger-sageLight text-ledger-sage border-ledger-sage/20",
          icon: CheckCircle2,
          borderBar: "bg-ledger-sage",
        };
      case "caution":
        return {
          label: "Caution",
          className: "bg-ledger-amberLight text-ledger-amber border-ledger-amber/30",
          icon: AlertTriangle,
          borderBar: "bg-ledger-amber",
        };
      case "over_pace":
        return {
          label: "Over Pace",
          className: "bg-ledger-amberLight text-ledger-amber border-ledger-amber/30",
          icon: Clock,
          borderBar: "bg-ledger-amber",
        };
      case "over_budget":
        return {
          label: "Over Budget",
          className: "bg-ledger-redLight text-ledger-red border-ledger-red/30",
          icon: AlertCircle,
          borderBar: "bg-ledger-red",
        };
      case "no_budget":
      case "unbudgeted":
      default:
        return {
          label: "No Budget",
          className: "bg-ledger-surfaceSubtle text-ledger-inkSubtle border-ledger-borderSubtle",
          icon: Tag,
          borderBar: "bg-ledger-border",
        };
    }
  };

  const currentPaceBadge = getPaceStatusBadge(paceStatus);

  return (
    <div className="space-y-5 md:space-y-6 min-w-0">
      {/* 1. Header & Institutional Month Switcher */}
      <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-ledger-borderSubtle pb-4 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
                Capital Allocation
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-ledger-ink tracking-tight">
              Budget Management
            </h2>
            <p className="text-xs text-ledger-inkMuted mt-0.5">
              Deterministic spending limits and real-time pacing calculated in integer paise.
            </p>
          </div>

          {/* Month Navigator Controller (>= 44px Touch Targets) */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 bg-ledger-surfaceSubtle border border-ledger-border rounded-md p-0.5 sm:p-1 select-none">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-serif font-bold text-xs sm:text-sm text-ledger-ink tabular-nums whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Four Executive Summary Metrics (Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 min-w-0 pt-0.5 sm:pt-1">
          {/* Metric 1: Total Budget Limit */}
          <div className="card-base p-3 sm:p-4.5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-medium text-ledger-inkMuted uppercase tracking-wider truncate">
                Total Budget
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center border border-ledger-border shrink-0">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ledger-teal" />
              </div>
            </div>
            <div className="space-y-0.5 sm:space-y-1 my-1 sm:my-2 min-w-0">
              <div className="font-serif text-base sm:text-2xl lg:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums truncate">
                <span className="sm:hidden">{formatINR(totalLimit, { showPaise: false })}</span>
                <span className="hidden sm:inline">{formatINR(totalLimit)}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-ledger-inkSubtle truncate">
                {budgetedCount} of {categoryBudgets.length} categories capped
              </div>
            </div>
          </div>

          {/* Metric 2: Total Amount Spent */}
          <div className="card-base p-3 sm:p-4.5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-medium text-ledger-inkMuted uppercase tracking-wider truncate">
                Month Spend
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center border border-ledger-border shrink-0">
                <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ledger-inkMuted" />
              </div>
            </div>
            <div className="space-y-0.5 sm:space-y-1 my-1 sm:my-2 min-w-0">
              <div className="font-serif text-base sm:text-2xl lg:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums truncate">
                <span className="sm:hidden">{formatINR(totalSpent, { showPaise: false })}</span>
                <span className="hidden sm:inline">{formatINR(totalSpent)}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-ledger-inkSubtle truncate">
                {utilization}% of allocation consumed
              </div>
            </div>
          </div>

          {/* Metric 3: Remaining Budget Buffer */}
          <div className="card-base p-3 sm:p-4.5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-medium text-ledger-inkMuted uppercase tracking-wider truncate">
                Remaining Buffer
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center border border-ledger-border shrink-0">
                {remaining >= 0 ? (
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ledger-sage" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ledger-red" />
                )}
              </div>
            </div>
            <div className="space-y-0.5 sm:space-y-1 my-1 sm:my-2 min-w-0">
              <div
                className={`font-serif text-base sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums truncate ${
                  remaining >= 0 ? "text-ledger-sage" : "text-ledger-red"
                }`}
              >
                <span className="sm:hidden">{formatINR(remaining, { showPaise: false })}</span>
                <span className="hidden sm:inline">{formatINR(remaining)}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-ledger-inkSubtle truncate">
                {remaining >= 0 ? "Under allocation limit" : "Budget overrun"}
              </div>
            </div>
          </div>

          {/* Metric 4: Spending Pace */}
          <div className="card-base p-3 sm:p-4.5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-medium text-ledger-inkMuted uppercase tracking-wider truncate">
                Spending Pace
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center border border-ledger-border shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ledger-teal" />
              </div>
            </div>
            <div className="space-y-0.5 sm:space-y-1 my-1 sm:my-2 min-w-0">
              <div className="font-serif text-base sm:text-2xl lg:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums truncate flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] sm:text-xs font-sans font-semibold border ${currentPaceBadge.className}`}
                >
                  {currentPaceBadge.label}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-ledger-inkSubtle truncate">
                Day {elapsedDays} of {totalDays} ({scheduledPercent}% elapsed)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Spending Pace Visualization & Burn Rate Card */}
      <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ledger-borderSubtle pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
                Timeline Calibration
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
              Monthly Spending Velocity & Pacing
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ledger-inkMuted font-mono">
              Timeline: <span className="font-semibold text-ledger-ink">Day {elapsedDays} of {totalDays}</span>
            </span>
          </div>
        </div>

        {/* Dual-Indicator Progress Track */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-ledger-inkMuted">
            <span>
              Budget Consumed: <strong className="text-ledger-ink tabular-nums font-mono">{utilization}%</strong>
            </span>
            <span>
              Expected at Day {elapsedDays}: <strong className="text-ledger-ink tabular-nums font-mono">{scheduledPercent}%</strong>
            </span>
          </div>

          <div className="relative w-full h-3.5 bg-ledger-surfaceSubtle rounded-full border border-ledger-borderSubtle overflow-hidden">
            {/* Scheduled Pace Marker Target Range */}
            <div
              className="absolute top-0 bottom-0 bg-ledger-teal/15 border-r-2 border-ledger-teal z-10 transition-all duration-300"
              style={{ width: `${scheduledPercent}%` }}
              title={`Scheduled Day ${elapsedDays} Pacing Target: ${scheduledPercent}%`}
            />

            {/* Actual Spending Fill */}
            <div
              className={`h-full rounded-full transition-all duration-500 relative z-20 ${
                utilization > 100
                  ? "bg-ledger-red"
                  : utilization > scheduledPercent + 10
                  ? "bg-ledger-amber"
                  : "bg-ledger-teal"
              }`}
              style={{ width: `${Math.min(100, Math.max(2, utilization))}%` }}
              title={`Actual Utilization: ${utilization}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-ledger-inkSubtle font-mono">
            <span>Day 1 (0%)</span>
            <span className="hidden sm:inline text-ledger-inkMuted">
              {utilization > scheduledPercent ? (
                <span className="text-ledger-amber font-semibold">
                  Spending {(utilization - scheduledPercent).toFixed(1)}% ahead of scheduled timeline
                </span>
              ) : (
                <span className="text-ledger-sage font-semibold">
                  Spending {(scheduledPercent - utilization).toFixed(1)}% under scheduled timeline
                </span>
              )}
            </span>
            <span>Day {totalDays} (100%)</span>
          </div>
        </div>

        {/* 4-Point Comparison Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 pt-2 border-t border-ledger-borderSubtle text-xs">
          <div className="p-2.5 rounded-md bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle">
            <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">Actual Spend</span>
            <span className="font-serif font-bold text-sm sm:text-base text-ledger-ink tabular-nums block mt-0.5">
              {pace?.spent_formatted || formatINR(totalSpent)}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle">
            <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">Target Pace (Day {elapsedDays})</span>
            <span className="font-serif font-bold text-sm sm:text-base text-ledger-ink tabular-nums block mt-0.5">
              {pace?.target_pace_formatted || formatINR(Math.round((totalLimit * elapsedDays) / totalDays))}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle">
            <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">Remaining Buffer</span>
            <span
              className={`font-serif font-bold text-sm sm:text-base tabular-nums block mt-0.5 ${
                remaining >= 0 ? "text-ledger-sage" : "text-ledger-red"
              }`}
            >
              {pace?.remaining_formatted || formatINR(remaining)}
            </span>
          </div>

          <div className="p-2.5 rounded-md bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle">
            <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">Projected Total</span>
            <span className="font-serif font-bold text-sm sm:text-base text-ledger-ink tabular-nums block mt-0.5">
              {pace?.projected_total_formatted || "Calculating..."}
            </span>
          </div>
        </div>

        {/* Deterministic Verdict Callout */}
        {pace?.verdict_sentence && (
          <div className="p-3 rounded-md bg-ledger-surfaceSubtle/90 border-l-4 border-ledger-teal flex items-start gap-2.5 text-xs text-ledger-ink">
            <div className="w-5 h-5 rounded-full bg-ledger-tealLight text-ledger-teal flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="font-semibold text-ledger-ink block text-[11px] uppercase tracking-wider font-mono">
                Pacing Verdict (Deterministic Fact)
              </span>
              <p className="text-ledger-inkMuted leading-relaxed">{pace.verdict_sentence}</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Category Budget Cards Section */}
      <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ledger-borderSubtle pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
                Granular Limits
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
              Category Allocation Ceilings
            </h3>
            <p className="text-xs text-ledger-inkMuted mt-0.5">
              Individual category limits, actual spending, and real-time pace indicators.
            </p>
          </div>

          {/* Filter Chips */}
          <div className="inline-flex items-center bg-ledger-surfaceSubtle border border-ledger-border rounded-md p-0.5 shrink-0 self-start sm:self-auto select-none">
            {(
              [
                { id: "all", label: `All (${categoryBudgets.length})` },
                { id: "budgeted", label: `Budgeted (${budgetedCount})` },
                { id: "attention", label: `Attention (${attentionCount})` },
                { id: "unbudgeted", label: "No Limit" },
              ] as const
            ).map((tab) => {
              const isActive = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    isActive
                      ? "bg-ledger-ink text-white shadow-hairline"
                      : "text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surface"
                  } focus-ring`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Grid */}
        {isLoading ? (
          <div className="p-10 text-center text-xs text-ledger-inkMuted animate-pulse">
            Loading monthly category budgets...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Shield className="w-8 h-8 text-ledger-inkSubtle mx-auto" />
            <p className="text-sm font-semibold text-ledger-ink">No Categories Match Filter</p>
            <p className="text-xs text-ledger-inkMuted">
              Try switching back to "All Categories" to view your full category list.
            </p>
            <button
              onClick={() => setFilterMode("all")}
              className="btn-secondary text-xs px-3 py-1.5 mt-2 focus-ring"
            >
              Show All Categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredCategories.map((cat) => {
              const hasBudget = cat.limit_paise > 0;
              const statusBadge = getPaceStatusBadge(cat.status);
              const IconComponent = CATEGORY_ICONS[cat.icon] || Tag;
              const isOver = cat.status === "over_budget";

              return (
                <div
                  key={cat.category_id}
                  className="card-base p-4 sm:p-5 flex flex-col justify-between transition-all hover:border-ledger-borderDark min-w-0"
                >
                  {/* Top: Icon + Name + Status Pill */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-ledger-surfaceSubtle text-ledger-teal flex items-center justify-center border border-ledger-border shrink-0">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-sm text-ledger-ink block truncate">
                            {cat.category_name}
                          </span>
                          <span className="text-[11px] text-ledger-inkSubtle block truncate font-mono">
                            {hasBudget ? `Ceiling: ${cat.limit_formatted}` : "No budget ceiling"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-semibold border shrink-0 ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Monetary Breakdown Hierarchy */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ledger-borderSubtle/60 text-xs">
                      <div>
                        <span className="text-[10px] text-ledger-inkSubtle font-mono uppercase block">Spent</span>
                        <span className="font-serif font-bold text-base text-ledger-ink tabular-nums block">
                          {cat.spent_formatted}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-ledger-inkSubtle font-mono uppercase block">
                          {hasBudget ? (isOver ? "Overrun" : "Remaining") : "Allocation"}
                        </span>
                        <span
                          className={`font-serif font-bold text-base tabular-nums block ${
                            hasBudget
                              ? isOver
                                ? "text-ledger-red"
                                : "text-ledger-sage"
                              : "text-ledger-inkSubtle"
                          }`}
                        >
                          {hasBudget ? cat.remaining_formatted : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {hasBudget ? (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-ledger-inkSubtle font-mono">
                          <span>{cat.utilization_percent}% utilized</span>
                          <span>
                            {cat.remaining_paise >= 0 ? `${formatINR(cat.remaining_paise)} left` : "Over limit"}
                          </span>
                        </div>
                        <div className="w-full bg-ledger-surfaceSubtle h-2 rounded-full overflow-hidden border border-ledger-borderSubtle">
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
                      <div className="p-2 rounded bg-ledger-surfaceSubtle/50 text-[11px] text-ledger-inkSubtle text-center">
                        No ceiling configured. Spending uncapped.
                      </div>
                    )}
                  </div>

                  {/* Card Action Button (Accessible >= 44px Touch Target) */}
                  <div className="pt-3 mt-3 border-t border-ledger-borderSubtle">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      aria-label={`Edit ${cat.category_name} budget`}
                      className="btn-secondary w-full text-xs min-h-[44px] flex items-center justify-center gap-1.5 focus-ring"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{hasBudget ? "Adjust Budget Limit" : "Set Budget Ceiling"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Accessible Category Budget Edit Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ledger-ink/40 backdrop-blur-sm animate-fade-in">
          <div className="card-base p-5 sm:p-6 shadow-modal max-w-md w-full rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
                  Allocation Control
                </span>
                <h3 className="font-serif text-lg font-bold text-ledger-ink">
                  Set Ceiling for {editingCat.category_name}
                </h3>
              </div>
              <button
                onClick={() => setEditingCat(null)}
                className="text-ledger-inkSubtle hover:text-ledger-ink p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded focus-ring"
                aria-label="Close edit dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div className="p-3 rounded-md bg-ledger-surfaceSubtle text-xs space-y-1">
                <div className="flex items-center justify-between text-ledger-inkMuted">
                  <span>Current Spent:</span>
                  <span className="font-mono font-bold text-ledger-ink tabular-nums">{editingCat.spent_formatted}</span>
                </div>
                <div className="flex items-center justify-between text-ledger-inkMuted">
                  <span>Current Limit:</span>
                  <span className="font-mono text-ledger-ink tabular-nums">
                    {editingCat.limit_paise > 0 ? editingCat.limit_formatted : "None (₹0.00)"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1.5">
                  Monthly Budget Limit (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  required
                  value={editLimitRupees}
                  onChange={(e) => setEditLimitRupees(e.target.value)}
                  placeholder="e.g. 15000"
                  className="input-base text-base font-mono font-bold tabular-nums"
                  autoFocus
                />
                <div className="flex items-center justify-between text-[11px] text-ledger-inkSubtle mt-1.5 font-mono">
                  <span>Integer paise precision</span>
                  <span>
                    Preview:{" "}
                    <strong className="text-ledger-ink">
                      {formatINR(rupeesToPaise(Number(editLimitRupees) || 0))}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-ledger-borderSubtle">
                {editingCat.limit_paise > 0 ? (
                  <button
                    type="button"
                    onClick={handleRemoveBudget}
                    disabled={setBudgetMutation.isPending}
                    className="p-2 min-h-[44px] text-xs text-ledger-red hover:bg-ledger-redLight rounded flex items-center gap-1 focus-ring"
                    title="Remove category ceiling"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Limit</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCat(null)}
                    className="btn-secondary text-xs sm:text-sm px-3.5 min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={setBudgetMutation.isPending}
                    className="btn-primary text-xs sm:text-sm px-4 min-h-[44px]"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    <span>{setBudgetMutation.isPending ? "Saving..." : "Save Ceiling"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
