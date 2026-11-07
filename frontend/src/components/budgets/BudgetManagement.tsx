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
  Tag,
} from "lucide-react";
import type { CategoryBudgetStatus, MonthlyBudgetOverview } from "../../lib/api";
import { fetchBudgetPace, setMonthlyBudgets } from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";
import { BudgetManagementSkeleton } from "../common/Skeleton";
import { GlassIcon, CategoryGlassIcon } from "../common/GlassIcon";
import { CalendarMonthPicker } from "../common/CalendarMonthPicker";

interface BudgetManagementProps {
  year: number;
  month: number;
  overview?: MonthlyBudgetOverview;
  onMonthChange: (year: number, month: number) => void;
  isLoading: boolean;
}

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
          dotColor: "bg-emerald-500",
          className: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/25",
          icon: CheckCircle2,
          borderBar: "bg-emerald-500",
        };
      case "caution":
        return {
          label: "Caution",
          dotColor: "bg-amber-500",
          className: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
          icon: AlertTriangle,
          borderBar: "bg-amber-500",
        };
      case "over_pace":
        return {
          label: "Over Pace",
          dotColor: "bg-amber-500",
          className: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30",
          icon: Clock,
          borderBar: "bg-amber-500",
        };
      case "over_budget":
        return {
          label: "Over Budget",
          dotColor: "bg-rose-500",
          className: "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30",
          icon: AlertCircle,
          borderBar: "bg-rose-500",
        };
      case "no_budget":
      case "unbudgeted":
      default:
        return {
          label: "Uncapped",
          dotColor: "bg-slate-400",
          className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 dark:border-white/10",
          icon: Tag,
          borderBar: "bg-slate-300",
        };
    }
  };

  const currentPaceBadge = getPaceStatusBadge(paceStatus);

  return (
    <div className="space-y-5 md:space-y-6 min-w-0">
      {/* 1. Header & Institutional Month Switcher with CalendarMonthPicker */}
      <div className="glass-panel p-4 sm:p-5 md:p-6 space-y-4 min-w-0 rounded-2xl relative z-30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-ledger-borderSubtle pb-4 min-w-0">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-ledger-ink tracking-tight">
              Budget Management
            </h2>
            <p className="text-xs text-ledger-inkMuted mt-0.5">
              Monthly spending limits and real-time budget pacing.
            </p>
          </div>

          {/* Month Navigator Controller with CalendarMonthPicker (>= 44px Touch Targets) */}
          <div className="flex items-center bg-ledger-surfaceSubtle border border-ledger-border rounded-xl p-0.5 shrink-0 shadow-xs relative z-40 select-none self-start sm:self-auto">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <CalendarMonthPicker
              year={year}
              month={month}
              onSelect={onMonthChange}
            />
            <button
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink focus-ring transition-colors cursor-pointer"
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
              <GlassIcon icon={Target} variant="teal" size="xs" className="sm:hidden" />
              <GlassIcon icon={Target} variant="teal" size="sm" className="hidden sm:inline-flex" />
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
              <GlassIcon icon={ArrowDownRight} variant="rose" size="xs" className="sm:hidden" />
              <GlassIcon icon={ArrowDownRight} variant="rose" size="sm" className="hidden sm:inline-flex" />
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
              <GlassIcon
                icon={remaining >= 0 ? Shield : AlertCircle}
                variant={remaining >= 0 ? "emerald" : "rose"}
                size="xs"
                className="sm:hidden"
              />
              <GlassIcon
                icon={remaining >= 0 ? Shield : AlertCircle}
                variant={remaining >= 0 ? "emerald" : "rose"}
                size="sm"
                className="hidden sm:inline-flex"
              />
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
              <GlassIcon icon={Clock} variant="indigo" size="xs" className="sm:hidden" />
              <GlassIcon icon={Clock} variant="indigo" size="sm" className="hidden sm:inline-flex" />
            </div>
            <div className="space-y-0.5 sm:space-y-1 my-1 sm:my-2 min-w-0">
              <div className="font-serif text-base sm:text-2xl lg:text-3xl font-bold text-ledger-ink tracking-tight tabular-nums truncate flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-semibold border ${currentPaceBadge.className} shadow-xs`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentPaceBadge.dotColor} shrink-0`} />
                  <span>{currentPaceBadge.label}</span>
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-ledger-inkSubtle truncate">
                Day {elapsedDays} of {totalDays} ({scheduledPercent}% elapsed)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Streamlined Monthly Spending Velocity Card */}
      <div className="glass-panel p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ledger-borderSubtle pb-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
              Monthly Spending Velocity
            </h3>
            <p className="text-xs text-ledger-inkMuted mt-0.5">
              Daily velocity targets and pacing trajectory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-medium border ${currentPaceBadge.className} shadow-xs`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentPaceBadge.dotColor} shrink-0`} />
              <span>
                {utilization > scheduledPercent
                  ? `${(utilization - scheduledPercent).toFixed(1)}% ahead of pace`
                  : `${(scheduledPercent - utilization).toFixed(1)}% under pace`}
              </span>
            </span>
          </div>
        </div>

        {/* Dual-Indicator Progress Track */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-ledger-inkMuted font-medium">
            <span>
              Budget Consumed: <strong className="text-ledger-ink tabular-nums font-mono">{utilization}%</strong>
            </span>
            <span>
              Calendar Elapsed: <strong className="text-ledger-ink tabular-nums font-mono">{scheduledPercent}%</strong> (Day {elapsedDays} of {totalDays})
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
            <span className="text-ledger-inkMuted">
              {utilization > scheduledPercent ? (
                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                  Spending {(utilization - scheduledPercent).toFixed(1)}% ahead of calendar timeline
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Spending {(scheduledPercent - utilization).toFixed(1)}% under calendar timeline
                </span>
              )}
            </span>
            <span>Day {totalDays} (100%)</span>
          </div>
        </div>

        {/* High-Utility Forward Velocity Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-ledger-borderSubtle">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              Daily Spending Velocity
            </span>
            <span className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
              {formatINR(Math.round(totalSpent / Math.max(1, elapsedDays)))}
              <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400 ml-1">/ day</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Recorded average per day
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              Allowable Daily Target
            </span>
            <span className="font-serif font-bold text-lg text-teal-700 dark:text-teal-400 tabular-nums block mt-1">
              {formatINR(Math.max(0, Math.round(remaining / Math.max(1, totalDays - elapsedDays))))}
              <span className="text-xs font-sans font-normal text-slate-500 dark:text-slate-400 ml-1">/ day</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Target for next {Math.max(1, totalDays - elapsedDays)} days
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold block">
              Projected Month-End Spend
            </span>
            <span className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
              {pace?.projected_total_formatted || formatINR(Math.round((totalSpent / Math.max(1, elapsedDays)) * totalDays))}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              At current daily velocity
            </span>
          </div>
        </div>
      </div>

      {/* 4. Category Budget Cards Section */}
      <div className="glass-panel p-4 sm:p-5 md:p-6 space-y-4 min-w-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ledger-borderSubtle pb-4">
          <div>
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
                      ? "bg-slate-900 text-white dark:bg-ledger-surfaceElevated dark:text-ledger-teal dark:border dark:border-ledger-border shadow-hairline font-semibold"
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
          <BudgetManagementSkeleton />
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
                        <CategoryGlassIcon iconName={cat.icon || cat.category_name} size="sm" />
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium border shrink-0 shadow-xs ${statusBadge.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor} shrink-0`} />
                        <span>{statusBadge.label}</span>
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

                  {/* Card Action Button (Accessible >= 44px Touch Target, Tactile Quiet Ledger styling) */}
                  <div className="pt-3 mt-3 border-t border-ledger-borderSubtle">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      aria-label={`Edit ${cat.category_name} budget`}
                      className="w-full text-xs min-h-[40px] rounded-xl flex items-center justify-center gap-2 font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 text-slate-900 dark:text-slate-100 border border-slate-300/90 dark:border-slate-600/80 shadow-xs transition-all active:scale-[0.99] cursor-pointer focus-ring"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-ledger-teal shrink-0" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
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
