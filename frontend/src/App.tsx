import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Navbar } from "./components/common/Navbar";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { NotFound } from "./components/common/NotFound";
import { ToastProvider, useToast } from "./components/common/Toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { VerdictStrip } from "./components/dashboard/VerdictStrip";
import { BudgetPaceHeroChart } from "./components/dashboard/BudgetPaceHeroChart";
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
  const totalDaysInMonth = summary?.total_days || 30;
  const currentDay = Math.min(new Date().getDate(), totalDaysInMonth);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-ledger-bg text-ledger-ink">
      <OfflineBanner />
      <Navbar currentTab={currentTab} onSelectTab={handleTabSelect} />

      <main className="flex-1 max-w-ledger w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 space-y-5 md:space-y-6 pb-20 md:pb-10">
        {/* TAB 1: DASHBOARD */}
        {currentTab === "dashboard" && (
          <div className="space-y-6 md:space-y-8 animate-fade-in">
            {/* 1. Verdict Strip (Headline & 4 Core KPIs) */}
            {isSummaryLoading && !summary ? (
              <div className="p-8 text-center bg-ledger-surface rounded-2xl border border-ledger-border text-ledger-inkMuted text-xs animate-pulse">
                Loading financial overview for {selectedMonth}/{selectedYear}...
              </div>
            ) : (
              <VerdictStrip
                year={selectedYear}
                month={selectedMonth}
                summary={summary}
                pace={pace}
                onMonthChange={handleMonthChange}
              />
            )}

            {/* 2. Signature "Quiet Ledger" Hero Chart */}
            <BudgetPaceHeroChart
              totalBudgetPaise={budgetsOverview?.total_limit_paise || 5000000}
              totalDays={totalDaysInMonth}
              currentDay={currentDay}
              transactions={monthTxs}
            />

            {/* 3. Grounded Insight Cards (Pace, Anomaly, Savings) */}
            <InsightCards
              pace={pace}
              anomalies={anomalyData?.anomalies || []}
              summary={summary}
              onNavigateToBudgets={() => setCurrentTab("budgets")}
              onNavigateToTransactions={() => setCurrentTab("transactions")}
            />

            {/* 4. Two-Column Grid: Category Breakdown + Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategoryBreakdownCard
                categories={summary?.category_breakdown || []}
                totalExpensePaise={summary?.expense_paise || 0}
              />
              <RecentTransactionsCard
                transactions={transactions}
                onViewAll={() => setCurrentTab("transactions")}
                onQuickAdd={() => setIsQuickAddOpen(true)}
              />
            </div>
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
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
