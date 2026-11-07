import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Target,
  ShieldCheck,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CategoryItem, FinancialPlanSummary } from "../../lib/api";
import { submitOnboardingSetup, skipOnboarding } from "../../lib/api";
import { formatINR, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";
import { CategoryGlassIcon } from "../common/GlassIcon";
import { PennyPilotLogo } from "../common/PennyPilotLogo";

interface IncomeRow {
  id: string;
  source: string;
  amountRupees: string;
  isRecurring: boolean;
}

interface FinancialOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  userDisplayName?: string;
}

export const FinancialOnboardingWizard: React.FC<FinancialOnboardingWizardProps> = ({
  isOpen,
  onClose,
  categories,
  userDisplayName,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 2 State: Incomes
  const [incomes, setIncomes] = useState<IncomeRow[]>([
    { id: "inc-1", source: "Primary Salary", amountRupees: "75000", isRecurring: true },
  ]);

  // Step 3 State: Category Budgets (category_id -> rupee string)
  const expenseCategories = categories.filter((c) => c.kind === "expense" && !c.is_archived);
  const [budgetLimits, setBudgetLimits] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    // Pre-populate recommended starter budgets
    for (const c of expenseCategories) {
      if (c.name.toLowerCase().includes("groceries")) defaults[c.id] = "12000";
      else if (c.name.toLowerCase().includes("housing") || c.name.toLowerCase().includes("rent")) defaults[c.id] = "20000";
      else if (c.name.toLowerCase().includes("dining") || c.name.toLowerCase().includes("food")) defaults[c.id] = "6000";
      else if (c.name.toLowerCase().includes("utilities")) defaults[c.id] = "4000";
      else if (c.name.toLowerCase().includes("transport")) defaults[c.id] = "5000";
      else defaults[c.id] = "3000";
    }
    return defaults;
  });

  // Step 4 State: Savings Target
  const [savingsTargetRupees, setSavingsTargetRupees] = useState("15000");

  // Step 5 Result State
  const [confirmedPlan, setConfirmedPlan] = useState<FinancialPlanSummary | null>(null);

  // Computations
  const totalIncomeRupees = incomes.reduce((sum, item) => {
    const num = Number(item.amountRupees);
    return sum + (!isNaN(num) && num > 0 ? num : 0);
  }, 0);

  const totalBudgetRupees = Object.values(budgetLimits).reduce((sum, val) => {
    const num = Number(val);
    return sum + (!isNaN(num) && num > 0 ? num : 0);
  }, 0);

  const plannedSavingsRupees = totalIncomeRupees - totalBudgetRupees;
  const targetRupees = Number(savingsTargetRupees) || 0;

  // Mutation
  const setupMutation = useMutation({
    mutationFn: submitOnboardingSetup,
    onSuccess: (data) => {
      setConfirmedPlan(data);
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["authMe"] });
      setStep(6);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to complete onboarding", "error");
    },
  });

  const handleSkip = async () => {
    try {
      await skipOnboarding();
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      toast("You can complete your financial setup anytime from the Dashboard.", "info");
      onClose();
    } catch {
      onClose();
    }
  };

  const handleAddIncomeRow = () => {
    setIncomes((prev) => [
      ...prev,
      { id: `inc-${Date.now()}`, source: "", amountRupees: "", isRecurring: true },
    ]);
  };

  const handleRemoveIncomeRow = (id: string) => {
    if (incomes.length <= 1) return;
    setIncomes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateIncomeRow = (id: string, field: keyof IncomeRow, val: any) => {
    setIncomes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleBudgetChange = (catId: string, val: string) => {
    setBudgetLimits((prev) => ({ ...prev, [catId]: val }));
  };

  const handleFinalSubmit = () => {
    const incomePayload = incomes
      .filter((i) => Number(i.amountRupees) > 0 && i.source.trim())
      .map((i) => ({
        source: i.source.trim(),
        amount_paise: rupeesToPaise(Number(i.amountRupees)),
        is_recurring: i.isRecurring,
      }));

    const budgetPayload = Object.entries(budgetLimits)
      .filter(([_, val]) => Number(val) >= 0 && val !== "")
      .map(([catId, val]) => ({
        category_id: catId,
        limit_paise: rupeesToPaise(Number(val) || 0),
      }));

    const targetPaise = targetRupees > 0 ? rupeesToPaise(targetRupees) : null;

    setupMutation.mutate({
      incomes: incomePayload,
      budgets: budgetPayload,
      monthly_savings_target_paise: targetPaise,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#141F2B] border border-slate-200 dark:border-[#2A3B45] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Step Progress Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-[#2A3B45] bg-slate-50/80 dark:bg-[#111A24]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PennyPilotLogo size="sm" variant="symbol" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-ledger-teal font-bold block">
                  {step <= 5 ? `Financial Setup • Step ${step} of 5` : "Financial Setup • Completed"}
                </span>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F3EF]">
                  {step === 1 && "Welcome to PennyPilot"}
                  {step === 2 && "Record Your Monthly Income"}
                  {step === 3 && "Allocate Category Budgets"}
                  {step === 4 && "Set Monthly Savings Goal"}
                  {step === 5 && "Review Your Financial Plan"}
                  {step === 6 && "Setup Completed"}
                </h2>
              </div>
            </div>

            {step < 6 && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-slate-500 dark:text-[#A8BAC4] hover:text-slate-800 dark:hover:text-white underline underline-offset-4 transition-colors font-medium cursor-pointer"
              >
                I'll Do This Later
              </button>
            )}
          </div>

          {/* 5-Step Unified Visual Progress Bar */}
          <div className="flex items-center gap-1.5 mt-3 pt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step > s || step === 6
                    ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)]"
                    : step === s
                    ? "bg-ledger-teal shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                    : "bg-slate-200 dark:bg-[#202F3B]"
                }`}
                title={`Step ${s}`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-6 py-2 text-center max-w-xl mx-auto">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F1F3EF] tracking-tight">
                  Hello, {userDisplayName || "Pilot"}!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A8BAC4] leading-relaxed max-w-md mx-auto">
                  PennyPilot gives you complete financial sovereignty with zero guesswork.
                  Let's configure your financial profile in 3 simple steps:
                </p>
              </div>

              {/* Three Introductory Feature Cards Aligned Equally */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
                {/* Feature Card 1: Inflow */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#2A3B45] bg-slate-50 dark:bg-[#192633] flex flex-col justify-between space-y-2.5 transition-all hover:border-emerald-500/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      01 Inflow
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#F1F3EF]">
                      Monthly Inflows
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-[#A8BAC4] mt-1 leading-relaxed">
                      Record salary, consulting & predictable earnings.
                    </p>
                  </div>
                </div>

                {/* Feature Card 2: Budgets */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#2A3B45] bg-slate-50 dark:bg-[#192633] flex flex-col justify-between space-y-2.5 transition-all hover:border-teal-500/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                      02 Budgets
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#F1F3EF]">
                      Category Budgets
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-[#A8BAC4] mt-1 leading-relaxed">
                      Establish realistic spending caps across essential living costs.
                    </p>
                  </div>
                </div>

                {/* Feature Card 3: Target */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#2A3B45] bg-slate-50 dark:bg-[#192633] flex flex-col justify-between space-y-2.5 transition-all hover:border-amber-500/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      03 Target
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#F1F3EF]">
                      Savings Cushion
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-[#A8BAC4] mt-1 leading-relaxed">
                      Plan an unallocated capital buffer towards wealth growth.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INCOMES */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-ledger-inkSubtle">
                Enter your anticipated monthly earnings. You can add multiple sources such as full-time employment, freelancing, or investments.
              </p>

              <div className="space-y-3">
                {incomes.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-ledger-teal">
                        Source #{idx + 1}
                      </span>
                      {incomes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIncomeRow(item.id)}
                          className="text-ledger-inkSubtle hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-ledger-inkSubtle block mb-1">
                          Source / Employer
                        </label>
                        <input
                          type="text"
                          required
                          value={item.source}
                          onChange={(e) => handleUpdateIncomeRow(item.id, "source", e.target.value)}
                          placeholder="e.g. Primary Salary, Upwork"
                          className="input-base w-full py-1.5 px-3 text-xs sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-ledger-inkSubtle block mb-1">
                          Monthly Amount (₹)
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
                            value={item.amountRupees}
                            onChange={(e) => handleUpdateIncomeRow(item.id, "amountRupees", e.target.value)}
                            placeholder="75000"
                            className="input-base w-full pl-7 pr-3 py-1.5 text-xs sm:text-sm font-mono font-semibold tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddIncomeRow}
                className="w-full py-2 border border-dashed border-ledger-borderSubtle hover:border-ledger-teal rounded-xl text-xs font-medium text-ledger-teal flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Income Source</span>
              </button>

              {/* Total Inflow Counter */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
                  Total Planned Monthly Inflow:
                </span>
                <span className="font-serif text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatINR(rupeesToPaise(totalIncomeRupees))}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: CATEGORY BUDGETS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-ledger-inkSubtle">
                  Set comfortable monthly spending limits for each category.
                </p>
                <span className="text-xs font-mono text-ledger-inkSubtle">
                  Inflow: <span className="font-bold text-ledger-ink">{formatINR(rupeesToPaise(totalIncomeRupees))}</span>
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {expenseCategories.map((cat) => {
                  const currentVal = budgetLimits[cat.id] || "";
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CategoryGlassIcon iconName={cat.icon} colorToken={cat.color_token} size="sm" />
                        <span className="text-xs sm:text-sm font-semibold text-ledger-ink truncate">
                          {cat.name}
                        </span>
                      </div>

                      <div className="relative shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-ledger-inkSubtle pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={currentVal}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                          placeholder="0"
                          className="input-base w-28 sm:w-36 pl-7 pr-3 py-1.5 text-xs sm:text-sm font-mono font-semibold tabular-nums text-right"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-time Budget vs Inflow Summary */}
              <div className="p-3.5 rounded-xl border border-ledger-borderSubtle bg-ledger-surfaceSubtle space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ledger-inkSubtle">Total Allocated Budget:</span>
                  <span className="font-serif font-bold text-ledger-ink tabular-nums">
                    {formatINR(rupeesToPaise(totalBudgetRupees))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-ledger-borderSubtle">
                  <span className="text-ledger-inkSubtle">Unallocated Income / Cushion:</span>
                  <span
                    className={`font-serif font-bold tabular-nums ${
                      plannedSavingsRupees >= 0 ? "text-ledger-teal" : "text-rose-500 font-semibold"
                    }`}
                  >
                    {plannedSavingsRupees >= 0 ? "+" : ""}
                    {formatINR(rupeesToPaise(plannedSavingsRupees))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SAVINGS TARGET */}
          {step === 4 && (
            <div className="space-y-5 max-w-md mx-auto text-center py-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Target className="w-7 h-7" />
              </div>

              <div>
                <h3 className="font-serif text-lg font-bold text-ledger-ink">
                  Set a Monthly Savings Target
                </h3>
                <p className="text-xs text-ledger-inkSubtle mt-1">
                  Optional goal for building an emergency fund, investments, or personal milestones.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80 text-left">
                <label className="text-xs font-medium text-ledger-inkSubtle block mb-1.5">
                  Target Savings Per Month (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-ledger-inkSubtle">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={savingsTargetRupees}
                    onChange={(e) => setSavingsTargetRupees(e.target.value)}
                    placeholder="15000"
                    className="input-base w-full pl-8 pr-4 py-2.5 text-base font-mono font-bold tabular-nums"
                  />
                </div>

                <div className="mt-3 text-[11px] text-ledger-inkSubtle flex items-center justify-between">
                  <span>Projected Savings Cushion:</span>
                  <span className="font-mono font-bold text-ledger-teal">
                    {formatINR(rupeesToPaise(plannedSavingsRupees))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PLAN SUMMARY */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-xs text-ledger-inkSubtle">
                Review your deterministic financial plan. Arithmetic is verified strictly in integer paise with zero hallucination.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80">
                  <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">
                    Monthly Income
                  </span>
                  <span className="font-serif text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatINR(rupeesToPaise(totalIncomeRupees))}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80">
                  <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">
                    Allocated Ceilings
                  </span>
                  <span className="font-serif text-base sm:text-lg font-bold text-ledger-ink tabular-nums">
                    {formatINR(rupeesToPaise(totalBudgetRupees))}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80">
                  <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">
                    Planned Savings Cushion
                  </span>
                  <span
                    className={`font-serif text-base sm:text-lg font-bold tabular-nums ${
                      plannedSavingsRupees >= 0 ? "text-ledger-teal" : "text-rose-500"
                    }`}
                  >
                    {formatINR(rupeesToPaise(plannedSavingsRupees))}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80">
                  <span className="text-[10px] font-mono uppercase text-ledger-inkSubtle block">
                    Savings Target
                  </span>
                  <span className="font-serif text-base sm:text-lg font-bold text-amber-500 tabular-nums">
                    {targetRupees > 0 ? formatINR(rupeesToPaise(targetRupees)) : "None"}
                  </span>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-3 rounded-xl bg-ledger-surfaceSubtle dark:bg-[#192633]/50 border border-ledger-borderSubtle dark:border-white/10 text-xs text-ledger-inkSubtle flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-ledger-teal shrink-0 mt-0.5" />
                <span>
                  Planned savings will be dynamically compared against your actual spending pace throughout each calendar month.
                </span>
              </div>
            </div>
          )}

          {/* STEP 6: FINISHED */}
          {step === 6 && (
            <div className="space-y-5 text-center max-w-md mx-auto py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="font-serif text-2xl font-bold text-ledger-ink">
                  Financial Setup Completed!
                </h3>
                <p className="text-xs text-ledger-inkSubtle mt-1.5 leading-relaxed">
                  Your income records and category allocations are now active in the ledger. Your dashboard will reflect your verified financial position.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-ledger-borderSubtle dark:border-white/10 bg-ledger-surface dark:bg-[#192633]/80 text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-ledger-inkSubtle">Monthly Inflow:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {confirmedPlan?.monthly_income_formatted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ledger-inkSubtle">Allocated Budget:</span>
                  <span className="font-bold text-ledger-ink">
                    {confirmedPlan?.allocated_budget_formatted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ledger-inkSubtle">Planned Savings:</span>
                  <span className="font-bold text-ledger-teal">
                    {confirmedPlan?.planned_savings_formatted}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="btn-primary w-full py-2.5 px-6 text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        {step < 6 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-[#2A3B45] bg-slate-50/80 dark:bg-[#111A24] flex items-center justify-between">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleSkip}
                className="btn-secondary py-2.5 px-4 min-h-[44px] text-xs font-semibold cursor-pointer select-none"
              >
                I'll Do This Later
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="btn-secondary py-2.5 px-4 min-h-[44px] text-xs flex items-center gap-1.5 font-semibold cursor-pointer select-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-primary py-2.5 px-6 min-h-[44px] text-xs sm:text-sm flex items-center gap-2 font-semibold shadow-md cursor-pointer select-none"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : step < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 2 && totalIncomeRupees <= 0) {
                      toast("Please enter at least one income source with an amount", "error");
                      return;
                    }
                    setStep((s) => (s + 1) as any);
                  }}
                  className="btn-primary py-2.5 px-5 min-h-[44px] text-xs flex items-center gap-1.5 font-semibold cursor-pointer select-none"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={setupMutation.isPending}
                  className="btn-primary py-2.5 px-6 min-h-[44px] text-xs sm:text-sm flex items-center gap-1.5 font-semibold cursor-pointer select-none"
                >
                  <span>Confirm & Save Plan</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
