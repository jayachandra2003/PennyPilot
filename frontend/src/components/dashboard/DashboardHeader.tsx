import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
} from "lucide-react";
import { CalendarMonthPicker } from "../common/CalendarMonthPicker";
import type { BudgetPace } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

interface DashboardHeaderProps {
  year: number;
  month: number;
  period: "monthly" | "yearly";
  onPeriodChange: (period: "monthly" | "yearly") => void;
  pace?: BudgetPace;
  totalExpensePaise: number;
  onMonthChange: (year: number, month: number) => void;
  onQuickAdd: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  year,
  month,
  period,
  onPeriodChange,
  onMonthChange,
  onQuickAdd,
}) => {
  const { user } = useAuth();

  // Dynamic time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName =
    user?.display_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Pilot";

  const handlePrev = () => {
    if (period === "yearly") {
      onMonthChange(year - 1, month);
    } else {
      if (month === 1) onMonthChange(year - 1, 12);
      else onMonthChange(year, month - 1);
    }
  };

  const handleNext = () => {
    if (period === "yearly") {
      onMonthChange(year + 1, month);
    } else {
      if (month === 12) onMonthChange(year + 1, 1);
      else onMonthChange(year, month + 1);
    }
  };

  return (
    <div className="glass-panel p-4 sm:p-5 md:p-6 min-w-0 relative z-20 rounded-2xl">
      {/* Top Controller Bar - Clean, balanced without Monthly Verdict banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0 relative z-30">
        <div>
          {/* Clear Secondary Heading Greeting (Executive Position removed, font enlarged) */}
          <h2 className="text-sm sm:text-base font-medium text-ledger-teal font-sans tracking-normal">
            {getGreeting()}, {displayName}!
          </h2>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-ledger-ink tracking-tight mt-0.5">
            Financial Overview
          </h1>
        </div>

        {/* Right Controls: Period Selector, Date Stepper & Quick Add */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto min-w-0 relative z-30">
          {/* Mobile Top Row: Period Selector on left, Quick Add on right (Desktop: inline via sm:contents) */}
          <div className="flex items-center justify-between sm:contents gap-2.5">
            {/* Period Selector Toggle [ Monthly | Yearly ] */}
            <div
              role="group"
              aria-label="Reporting period"
              className="inline-flex items-center p-0.5 bg-ledger-surfaceSubtle border border-ledger-border rounded-xl shadow-xs shrink-0"
            >
              <button
                type="button"
                onClick={() => onPeriodChange("monthly")}
                aria-pressed={period === "monthly"}
                className={`px-3 py-1.5 min-h-[38px] sm:min-h-[36px] rounded-lg text-xs font-semibold transition-all cursor-pointer focus-ring select-none ${
                  period === "monthly"
                    ? "bg-white dark:bg-[#192633] text-ledger-teal dark:text-ledger-teal shadow-xs border border-slate-200 dark:border-white/10"
                    : "text-ledger-inkSubtle hover:text-ledger-ink"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => onPeriodChange("yearly")}
                aria-pressed={period === "yearly"}
                className={`px-3 py-1.5 min-h-[38px] sm:min-h-[36px] rounded-lg text-xs font-semibold transition-all cursor-pointer focus-ring select-none ${
                  period === "yearly"
                    ? "bg-white dark:bg-[#192633] text-ledger-teal dark:text-ledger-teal shadow-xs border border-slate-200 dark:border-white/10"
                    : "text-ledger-inkSubtle hover:text-ledger-ink"
                }`}
              >
                Yearly
              </button>
            </div>

            {/* Quick Add Action Button (Mobile: top-right aligned; Desktop: order-last) */}
            <button
              type="button"
              onClick={onQuickAdd}
              className="btn-primary text-xs sm:text-sm px-3.5 sm:px-4 py-2 min-h-[40px] sm:min-h-[40px] focus-ring shrink-0 shadow-xs cursor-pointer select-none sm:order-last"
              title="Quick add transaction"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Quick Add</span>
            </button>
          </div>

          {/* Date Navigator - Full-width balanced stepper on mobile, compact on desktop */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-center bg-ledger-surfaceSubtle border border-ledger-border rounded-xl p-0.5 shrink-0 shadow-xs relative z-40">
            <button
              type="button"
              onClick={handlePrev}
              aria-label={period === "yearly" ? "Previous year" : "Previous month"}
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink transition-colors focus-ring cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {period === "yearly" ? (
              <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-mono font-semibold text-ledger-ink select-none">
                <Calendar className="w-4 h-4 text-ledger-teal shrink-0" aria-hidden="true" />
                <span>{year}</span>
              </div>
            ) : (
              <div className="flex-1 sm:flex-initial flex items-center justify-center">
                <CalendarMonthPicker
                  year={year}
                  month={month}
                  onSelect={onMonthChange}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleNext}
              aria-label={period === "yearly" ? "Next year" : "Next month"}
              className="p-2 min-w-[44px] min-h-[44px] sm:p-1.5 sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg hover:bg-ledger-surface text-ledger-inkMuted hover:text-ledger-ink transition-colors focus-ring cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
