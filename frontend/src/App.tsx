import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Navbar } from "./components/common/Navbar";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { NotFound } from "./components/common/NotFound";
import { ToastProvider, useToast } from "./components/common/Toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DashboardHeader } from "./components/dashboard/DashboardHeader";
import { MetricCards } from "./components/dashboard/MetricCards";
import { BudgetIntelligenceCard } from "./components/dashboard/BudgetIntelligenceCard";
import { CategoryBreakdownCard } from "./components/dashboard/CategoryBreakdownCard";
import { RecentTransactionsCard } from "./components/dashboard/RecentTransactionsCard";
import { InsightCards } from "./components/dashboard/InsightCards";
import { TransactionList } from "./components/transactions/TransactionList";
import { NLQuickAddModal } from "./components/transactions/NLQuickAddModal";
import { BudgetManagement } from "./components/budgets/BudgetManagement";
import { CopilotView } from "./components/copilot/CopilotView";
import {
  fetchAnomalies,
  fetchBudgetPace,
  fetchCategories,
  fetchMonthlyBudgets,
  fetchMonthlySummary,
  fetchTransactions,
} from "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30, // 30s
    },
  },
});

function MainDashboard() {
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);

  const { user, loginDemo } = useAuth();
  const { toast } = useToast();

  // Queries
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["monthlySummary", selectedYear, selectedMonth],
    queryFn: () => fetchMonthlySummary(selectedYear, selectedMonth),
    enabled: !!user,
  });

  const { data: pace } = useQuery({
    queryKey: ["budgetPace", selectedYear, selectedMonth],
    queryFn: () => fetchBudgetPace(selectedYear, selectedMonth),
    enabled: !!user,
  });

  const { data: transactions = [], isLoading: isTxLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchTransactions(),
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: !!user,
  });

  const { data: budgetsOverview, isLoading: isBudgetsLoading } = useQuery({
    queryKey: ["budgets", selectedYear, selectedMonth],
    queryFn: () => fetchMonthlyBudgets(selectedYear, selectedMonth),
    enabled: !!user,
  });

  const { data: anomalyData } = useQuery({
    queryKey: ["anomalies"],
    queryFn: fetchAnomalies,
    enabled: !!user,
  });

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleTabSelect = (tab: string) => {
    if (tab === "quick_add") {
      setIsQuickAddOpen(true);
    } else {
      setCurrentTab(tab);
    }
  };

  if (currentTab === "404") {
    return <NotFound onBackToHome={() => setCurrentTab("dashboard")} />;
  }

  // Filter transactions for currently selected month for the hero chart
  const monthPrefix = `${selectedYear}-${selectedMonth.toString().padStart(2, "0")}`;
  const monthTxs = transactions.filter((t) => t.occurred_on.startsWith(monthPrefix));
  const totalDaysInMonth = pace?.total_days ?? summary?.total_days ?? 30;
  const currentDay = pace?.elapsed_days ?? Math.min(6, totalDaysInMonth);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-ledger-bg text-ledger-ink">
      {/* Accessible Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:bg-ledger-teal focus:text-white focus:rounded-md focus:shadow-float focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ledger-teal text-xs font-medium"
      >
        Skip to main content
      </a>

      <OfflineBanner />
      <Navbar currentTab={currentTab} onSelectTab={handleTabSelect} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-ledger w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-5 md:py-6 space-y-4 sm:space-y-5 md:space-y-6 pb-28 md:pb-10 focus:outline-none min-w-0 overflow-x-hidden"
        aria-label="Main financial ledger content"
      >
        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {currentTab === "dashboard" && (
          <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in min-w-0">
            {/* 1. Dashboard Header: Month Controller & Computed Verdict */}
            <DashboardHeader
              year={selectedYear}
              month={selectedMonth}
              pace={pace}
              totalExpensePaise={summary?.expense_paise || 0}
              onMonthChange={handleMonthChange}
              onQuickAdd={() => setIsQuickAddOpen(true)}
            />

            {/* 2. Four Prominent Financial KPI Panels */}
            {isSummaryLoading && !summary ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="card-base p-4 sm:p-5 h-28 animate-pulse bg-ledger-surfaceSubtle border-ledger-borderSubtle"
                  />
                ))}
              </div>
            ) : (
              <MetricCards summary={summary} />
            )}

            {/* 3. Budget Intelligence & Spending Pace Hero Chart */}
            <BudgetIntelligenceCard
              totalBudgetPaise={budgetsOverview?.total_limit_paise || 5500000}
              totalDays={totalDaysInMonth}
              currentDay={currentDay}
              pace={pace}
              transactions={monthTxs}
            />

            {/* 4. Two-Column Analytics Grid: Category Breakdown + Recent Financial Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 min-w-0">
              <CategoryBreakdownCard
                categories={summary?.category_breakdown || []}
                totalExpensePaise={summary?.expense_paise || 0}
              />
              <RecentTransactionsCard
                transactions={monthTxs.length > 0 ? monthTxs : transactions}
                onViewAll={() => setCurrentTab("transactions")}
                onQuickAdd={() => setIsQuickAddOpen(true)}
              />
            </div>

            {/* 5. Grounded Financial Insights & Signals */}
            <InsightCards
              pace={pace}
              anomalies={anomalyData?.anomalies || []}
              summary={summary}
              onNavigateToBudgets={() => setCurrentTab("budgets")}
              onNavigateToTransactions={() => setCurrentTab("transactions")}
            />
          </div>
        )}

        {/* TAB 2: TRANSACTIONS LEDGER */}
        {currentTab === "transactions" && (
          <div className="animate-fade-in">
            <TransactionList
              transactions={transactions}
              categories={categories}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              isLoading={isTxLoading}
            />
          </div>
        )}

        {/* TAB 3: BUDGET MANAGEMENT */}
        {currentTab === "budgets" && (
          <div className="animate-fade-in">
            <BudgetManagement
              year={selectedYear}
              month={selectedMonth}
              overview={budgetsOverview}
              onMonthChange={handleMonthChange}
              isLoading={isBudgetsLoading}
            />
          </div>
        )}

        {/* TAB 4: GROUNDED AI COPILOT */}
        {currentTab === "copilot" && (
          <div className="animate-fade-in">
            <CopilotView year={selectedYear} month={selectedMonth} />
          </div>
        )}
      </main>

      {/* Global Natural Language Quick-Add Modal */}
      <NLQuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        categories={categories}
      />

      {/* Production Footer */}
      <footer className="border-t border-ledger-border bg-ledger-surface py-6 px-4 lg:px-8 text-xs text-ledger-inkSubtle mt-auto">
        <div className="max-w-ledger mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 PennyPilot. Engineered for NIVUNA Labs Assignment. Strict ₹0 budget.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-ledger-ink cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-ledger-ink cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-ledger-ink cursor-pointer">Security Standards</span>
            <span>•</span>
            <button
              onClick={() => loginDemo().then(() => toast("Switched to Demo Account", "info"))}
              className="text-ledger-teal hover:underline font-medium"
            >
              Reset Demo User
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <MainDashboard />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
