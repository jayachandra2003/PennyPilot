import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Navbar } from "./components/common/Navbar";
import { OfflineBanner } from "./components/common/OfflineBanner";
import { PWAInstallBanner } from "./components/common/PWAInstallBanner";
import {
  DashboardMetricCardsSkeleton,
  HeroChartSkeleton,
} from "./components/common/Skeleton";
import { NotFound } from "./components/common/NotFound";
import { ToastProvider } from "./components/common/Toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { DashboardHeader } from "./components/dashboard/DashboardHeader";
import { MetricCards } from "./components/dashboard/MetricCards";
import { CompactCashFlowSummary } from "./components/dashboard/CompactCashFlowSummary";
import { ExpenseDonutChart } from "./components/dashboard/ExpenseDonutChart";
import { IncomeSourceBreakdownCard } from "./components/dashboard/IncomeSourceBreakdownCard";
import { BudgetIntelligenceCard } from "./components/dashboard/BudgetIntelligenceCard";
import { RecentTransactionsCard } from "./components/dashboard/RecentTransactionsCard";
import { InsightsView } from "./components/insights/InsightsView";
import { TransactionList } from "./components/transactions/TransactionList";
import { NLQuickAddModal } from "./components/transactions/NLQuickAddModal";
import { AuthModal } from "./components/auth/AuthModal";
import { EmailVerificationModal } from "./components/auth/EmailVerificationModal";
import { ResetPasswordModal } from "./components/auth/ResetPasswordModal";
import { ProfileModal } from "./components/profile/ProfileModal";
import { BudgetManagement } from "./components/budgets/BudgetManagement";
import { BudgetEditorModal } from "./components/budgets/BudgetEditorModal";
import { IncomeManagementModal } from "./components/income/IncomeManagementModal";
import { FinancialOnboardingWizard } from "./components/onboarding/FinancialOnboardingWizard";
import { OnboardingReminderBanner } from "./components/onboarding/OnboardingReminderBanner";
import { OnboardingTutorialTour, TUTORIAL_STEPS } from "./components/onboarding/OnboardingTutorialTour";
import { CategoryManagement } from "./components/categories/CategoryManagement";
import { HistoricalAnalytics } from "./components/analytics/HistoricalAnalytics";
import { CopilotView } from "./components/copilot/CopilotView";
import { FloatingCopilotButton } from "./components/copilot/FloatingCopilotButton";
import { PrivacyPolicy } from "./components/legal/PrivacyPolicy";
import { TermsOfService } from "./components/legal/TermsOfService";
import { SecurityStandards } from "./components/legal/SecurityStandards";
import { SettingsView } from "./components/settings/SettingsView";
import type { CategoryItem } from "./lib/api";
import {
  fetchAnomalies,
  fetchBudgetPace,
  fetchCategories,
  fetchMonthlyBudgets,
  fetchMonthlyIncome,
  fetchMonthlySummary,
  fetchOnboardingStatus,
  fetchTransactions,
  updateTutorialStatus,
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
  // Detect initial route
  const isPrivacyRoute = typeof window !== "undefined" && window.location.pathname.includes("/privacy");
  const isTermsRoute = typeof window !== "undefined" && window.location.pathname.includes("/terms");
  const isSecurityRoute = typeof window !== "undefined" && window.location.pathname.includes("/security");
  const initialTab = isPrivacyRoute ? "privacy" : isTermsRoute ? "terms" : isSecurityRoute ? "security" : "dashboard";

  const [currentTab, setCurrentTab] = useState<string>(initialTab);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isBudgetEditorOpen, setIsBudgetEditorOpen] = useState<boolean>(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState<boolean>(false);
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<"profile" | "appearance" | "currency" | "account">("profile");

  const handleNavigateTab = (tab: string, section?: string) => {
    if (tab === "settings" && section) {
      setSettingsInitialSection(section as any);
    }
    setCurrentTab(tab);
  };

  // Synchronize browser back/forward buttons with tab state
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes("/privacy")) setCurrentTab("privacy");
      else if (path.includes("/terms")) setCurrentTab("terms");
      else if (path.includes("/security")) setCurrentTab("security");
      else if (path === "/" || path === "") setCurrentTab("dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenLegal = (doc: "privacy" | "terms" | "security") => {
    setCurrentTab(doc);
    if (typeof window !== "undefined" && window.history?.pushState) {
      window.history.pushState({}, "", `/${doc}`);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentTab("dashboard");
    if (typeof window !== "undefined" && window.history?.pushState) {
      window.history.pushState({}, "", "/");
    }
  };

  // Route detection: password reset vs email verification
  const isResetRoute = typeof window !== "undefined" && window.location.pathname.includes("/reset-password");
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const rawToken = searchParams.get("token");

  // Password reset route
  const resetToken = isResetRoute ? rawToken : null;
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(isResetRoute);

  const handleCloseResetPassword = () => {
    setIsResetModalOpen(false);
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname === "/reset-password" ? "/" : window.location.pathname);
    }
  };

  const handleOpenLoginFromReset = () => {
    handleCloseResetPassword();
    setIsAuthModalOpen(true);
  };

  // Email verification route
  const verifyToken = !isResetRoute ? rawToken : null;
  const verifyStatus = searchParams.get("status") as "success" | "expired" | "invalid" | null;
  const verifyEmailParam = searchParams.get("email");
  const isVerifyRoute = typeof window !== "undefined" && !isResetRoute && (window.location.pathname.includes("/verify-email") || !!verifyToken || !!verifyStatus);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(isVerifyRoute);

  const handleCloseVerification = () => {
    setIsVerificationModalOpen(false);
    if (typeof window !== "undefined" && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname === "/verify-email" ? "/" : window.location.pathname);
    }
  };

  const handleOpenLoginFromVerification = () => {
    handleCloseVerification();
    setIsAuthModalOpen(true);
  };

  const { user, isLoading: isAuthLoading } = useAuth();

  // Queries
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["monthlySummary", selectedYear, selectedMonth, period],
    queryFn: () => fetchMonthlySummary(selectedYear, selectedMonth, period),
    enabled: !!user,
  });

  const { data: incomeOverview } = useQuery({
    queryKey: ["incomeOverview", selectedYear, selectedMonth, period],
    queryFn: () => fetchMonthlyIncome(selectedYear, selectedMonth, period),
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

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(false),
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

  const { data: onboardingStatus } = useQuery({
    queryKey: ["onboardingStatus"],
    queryFn: fetchOnboardingStatus,
    enabled: !!user,
  });

  // Prompt first-time financial onboarding for newly registered & verified users
  useEffect(() => {
    if (
      user &&
      user.email_verified &&
      onboardingStatus &&
      onboardingStatus.onboarding_completed === false &&
      sessionStorage.getItem("pennypilot_onboarding_dismissed") !== "true"
    ) {
      setIsOnboardingWizardOpen(true);
    }
  }, [user, onboardingStatus]);

  // First-Time Interactive Guided Product Tour State
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);

  // Auto-launch tutorial for eligible first-time users
  useEffect(() => {
    if (!user) return;

    const completedLocal = localStorage.getItem(`pennypilot_tutorial_completed_${user.id}`);
    const skippedLocal = localStorage.getItem(`pennypilot_tutorial_skipped_${user.id}`);
    const isCompleted =
      user.tutorial_completed ||
      onboardingStatus?.tutorial_completed ||
      completedLocal === "true" ||
      skippedLocal === "true";

    if (!isCompleted && !isOnboardingWizardOpen) {
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user, onboardingStatus, isOnboardingWizardOpen]);

  const handleTutorialReplay = () => {
    setCurrentTab("dashboard");
    setTutorialStepIndex(0);
    setIsTutorialOpen(true);
  };

  const handleTutorialSkip = async () => {
    setIsTutorialOpen(false);
    if (user) {
      localStorage.setItem(`pennypilot_tutorial_skipped_${user.id}`, "true");
      try {
        await updateTutorialStatus({ completed: true, skipped: true });
      } catch (e) {
        // Fallback to local storage
      }
    }
  };

  const handleTutorialFinish = async () => {
    setIsTutorialOpen(false);
    if (user) {
      localStorage.setItem(`pennypilot_tutorial_completed_${user.id}`, "true");
      try {
        await updateTutorialStatus({ completed: true, skipped: false });
      } catch (e) {
        // Fallback to local storage
      }
    }
  };

  // Window custom events for automated verification & settings navigation
  useEffect(() => {
    const handleOpenWizard = () => setIsOnboardingWizardOpen(true);
    const handleOpenIncome = () => setIsIncomeModalOpen(true);
    const handleOpenSettings = () => setCurrentTab("settings");
    window.addEventListener("pennypilot:open-onboarding", handleOpenWizard);
    window.addEventListener("pennypilot:open-income", handleOpenIncome);
    window.addEventListener("pennypilot:replay-tutorial", handleTutorialReplay);
    window.addEventListener("pennypilot:open-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("pennypilot:open-onboarding", handleOpenWizard);
      window.removeEventListener("pennypilot:open-income", handleOpenIncome);
      window.removeEventListener("pennypilot:replay-tutorial", handleTutorialReplay);
      window.removeEventListener("pennypilot:open-settings", handleOpenSettings);
    };
  }, []);

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
    <div className="flex-1 flex flex-col min-h-screen bg-ledger-bg text-ledger-ink relative">
      {/* Soft Ambient Canvas Lighting (Subtle Warm Brand Accent Wash - Mint, Cream & Soft Blue) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-[12%] -left-[8%] w-[55vw] h-[55vw] rounded-full blur-[130px] opacity-45 dark:opacity-25 bg-gradient-to-br from-teal-400 via-emerald-300 to-transparent dark:from-teal-500/30 dark:via-emerald-500/15 dark:to-transparent" />
        <div className="absolute top-[25%] -right-[12%] w-[48vw] h-[48vw] rounded-full blur-[140px] opacity-35 dark:opacity-20 bg-gradient-to-bl from-amber-300 via-orange-200 to-transparent dark:from-amber-500/25 dark:via-purple-500/15 dark:to-transparent" />
        <div className="absolute -bottom-[15%] left-[20%] w-[55vw] h-[55vw] rounded-full blur-[150px] opacity-35 dark:opacity-25 bg-gradient-to-tr from-sky-300 via-teal-200 to-transparent dark:from-sky-500/20 dark:via-indigo-500/20 dark:to-transparent" />
      </div>
      {/* Accessible Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-2 focus:bg-ledger-teal focus:text-white focus:rounded-md focus:shadow-float focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ledger-teal text-xs font-medium"
      >
        Skip to main content
      </a>

      <OfflineBanner />
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleTabSelect}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenLegal={handleOpenLegal}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-ledger w-full mx-auto px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-12 pt-[86px] sm:pt-[92px] md:pt-[98px] pb-28 lg:pb-12 space-y-6 sm:space-y-7 md:space-y-8 focus:outline-none min-w-0 relative z-10"
        aria-label="Main financial ledger content"
      >
        {/* PWA Install Promotion Banner */}
        <PWAInstallBanner />

        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {currentTab === "dashboard" && (
          <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in min-w-0">
            {/* First-Time Onboarding Reminder Banner (Non-intrusive) */}
            {onboardingStatus && !onboardingStatus.onboarding_completed && (
              <OnboardingReminderBanner onOpenWizard={() => setIsOnboardingWizardOpen(true)} />
            )}

            {/* 1. Dashboard Header: Month Controller, Greeting, Verdict & Period Selector */}
            <DashboardHeader
              year={selectedYear}
              month={selectedMonth}
              period={period}
              onPeriodChange={setPeriod}
              pace={pace}
              totalExpensePaise={summary?.expense_paise || 0}
              onMonthChange={handleMonthChange}
              onQuickAdd={() => setIsQuickAddOpen(true)}
            />

            {/* 2. Eight Primary Financial KPI Panels */}
            {isSummaryLoading && !summary ? (
              <DashboardMetricCardsSkeleton />
            ) : (
              <MetricCards
                period={period}
                summary={summary}
                budgetsOverview={budgetsOverview}
                totalDays={totalDaysInMonth}
                onEditBudget={() => setIsBudgetEditorOpen(true)}
                onManageIncome={() => setIsIncomeModalOpen(true)}
                onQuickAdd={() => setIsQuickAddOpen(true)}
              />
            )}

            {/* 3. Compact Cash Flow Performance & Expense Distribution (Equal Sized Two-Column Row) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 min-w-0 items-stretch">
              <div className="min-w-0 flex flex-col">
                <CompactCashFlowSummary period={period} summary={summary} />
              </div>
              <div className="min-w-0 flex flex-col">
                <ExpenseDonutChart
                  categories={summary?.category_breakdown || []}
                  totalExpensePaise={summary?.expense_paise || 0}
                />
              </div>
            </div>

            {/* 4. Financial Trajectory & Daily Velocity (65%) and Income Streams (35%) Side-by-Side */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 md:gap-6 min-w-0 items-stretch">
              <div className="w-full lg:w-[65%] min-w-0 flex flex-col">
                {isSummaryLoading && !summary && isTxLoading ? (
                  <HeroChartSkeleton />
                ) : (
                  <BudgetIntelligenceCard
                    totalBudgetPaise={budgetsOverview?.total_limit_paise ?? 0}
                    totalDays={totalDaysInMonth}
                    currentDay={currentDay}
                    pace={pace}
                    transactions={monthTxs}
                  />
                )}
              </div>
              <div className="w-full lg:w-[35%] min-w-0 flex flex-col">
                <IncomeSourceBreakdownCard
                  incomeOverview={incomeOverview}
                  period={period}
                  onManageIncome={() => setIsIncomeModalOpen(true)}
                />
              </div>
            </div>

            {/* 5. Recent Transactions (Full Space) */}
            <div className="w-full min-w-0">
              <RecentTransactionsCard
                transactions={monthTxs.length > 0 ? monthTxs : transactions}
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

        {/* TAB 4: HISTORICAL FINANCIAL ANALYTICS */}
        {currentTab === "analytics" && (
          <div className="animate-fade-in">
            <HistoricalAnalytics initialYear={selectedYear} initialMonth={selectedMonth} />
          </div>
        )}

        {/* TAB 5: DEDICATED FINANCIAL INSIGHTS */}
        {currentTab === "insights" && (
          <div className="animate-fade-in">
            <InsightsView
              pace={pace}
              anomalies={anomalyData?.anomalies || []}
              summary={summary}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              onNavigateToBudgets={() => setCurrentTab("budgets")}
              onNavigateToTransactions={() => setCurrentTab("transactions")}
              onNavigateToAnalytics={() => setCurrentTab("analytics")}
            />
          </div>
        )}

        {/* TAB 6: CATEGORY MANAGEMENT */}
        {currentTab === "categories" && (
          <div className="animate-fade-in">
            <CategoryManagement />
          </div>
        )}

        {/* TAB 6: GROUNDED AI COPILOT */}
        {currentTab === "copilot" && (
          <div className="animate-fade-in">
            <CopilotView
              year={selectedYear}
              month={selectedMonth}
              onNavigateTab={handleNavigateTab}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          </div>
        )}

        {/* TAB 7: PRIVACY POLICY */}
        {currentTab === "privacy" && (
          <div className="animate-fade-in">
            <PrivacyPolicy
              onSelectDoc={handleOpenLegal}
              onBackToDashboard={handleBackToDashboard}
            />
          </div>
        )}

        {/* TAB 8: TERMS OF SERVICE */}
        {currentTab === "terms" && (
          <div className="animate-fade-in">
            <TermsOfService
              onSelectDoc={handleOpenLegal}
              onBackToDashboard={handleBackToDashboard}
            />
          </div>
        )}

        {/* TAB 9: SECURITY STANDARDS */}
        {currentTab === "security" && (
          <div className="animate-fade-in">
            <SecurityStandards
              onSelectDoc={handleOpenLegal}
              onBackToDashboard={handleBackToDashboard}
            />
          </div>
        )}

        {/* TAB 10: USER SETTINGS */}
        {currentTab === "settings" && (
          <div className="animate-fade-in">
            <SettingsView
              key={settingsInitialSection}
              initialSection={settingsInitialSection}
              onReplayTutorial={handleTutorialReplay}
            />
          </div>
        )}
      </main>

      {/* Global Natural Language Quick-Add Modal */}
      <NLQuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        categories={categories}
      />

      {/* Quick Budget Allocation Editor Modal */}
      <BudgetEditorModal
        isOpen={isBudgetEditorOpen}
        onClose={() => setIsBudgetEditorOpen(false)}
        year={selectedYear}
        month={selectedMonth}
        overview={budgetsOverview}
        categories={categories}
        monthlyIncomePaise={summary?.income_paise || 0}
        onNavigateToBudgetsPage={() => setCurrentTab("budgets")}
      />

      {/* Monthly Income Management Modal */}
      <IncomeManagementModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        year={selectedYear}
        month={selectedMonth}
        categories={categories}
      />

      {/* Persistent Floating AI Copilot Assistant */}
      <FloatingCopilotButton
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        currentTab={currentTab}
        onNavigateToFullCopilot={() => setCurrentTab("copilot")}
        onNavigateTab={handleNavigateTab}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* First-Time Guided Financial Onboarding Wizard */}
      <FinancialOnboardingWizard
        isOpen={isOnboardingWizardOpen}
        onClose={() => setIsOnboardingWizardOpen(false)}
        categories={categories}
        userDisplayName={user?.display_name}
      />

      {/* First-Time Guided Product Tour (6-Step Interactive Walkthrough) */}
      <OnboardingTutorialTour
        isOpen={isTutorialOpen}
        currentStepIndex={tutorialStepIndex}
        onNext={() => setTutorialStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1))}
        onPrev={() => setTutorialStepIndex((prev) => Math.max(prev - 1, 0))}
        onSkip={handleTutorialSkip}
        onFinish={handleTutorialFinish}
        onNavigateTab={(tab) => setCurrentTab(tab)}
      />

      {/* User Profile & Preferences Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Password Reset Modal */}
      <ResetPasswordModal
        isOpen={isResetModalOpen}
        token={resetToken}
        onClose={handleCloseResetPassword}
        onOpenLogin={handleOpenLoginFromReset}
        onOpenForgotPassword={() => {
          handleCloseResetPassword();
          setIsAuthModalOpen(true);
        }}
      />

      {/* Email Verification Link Resolution Modal */}
      <EmailVerificationModal
        isOpen={isVerificationModalOpen}
        token={verifyToken}
        statusParam={verifyStatus}
        emailParam={verifyEmailParam}
        onClose={handleCloseVerification}
        onOpenLogin={handleOpenLoginFromVerification}
      />

      {/* Authentication & Registration Modal */}
      <AuthModal
        isOpen={!user && !isAuthLoading ? true : isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        isForced={!user}
      />

      {/* Production Footer - Solid white in Light mode, Solid Midnight Ledger in Dark mode */}
      <footer className="border-t border-slate-200/90 bg-white dark:bg-[#101820] dark:border-[#2A3B45] py-6 px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-12 text-xs text-ledger-inkSubtle mt-auto relative z-10 transition-colors">
        <div className="max-w-ledger mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans font-medium text-slate-800 dark:text-[#F1F3EF]">© 2026 PennyPilot</p>
          <nav className="flex items-center gap-4 text-xs" aria-label="Legal document links">
            <button
              type="button"
              onClick={() => handleOpenLegal("privacy")}
              className="text-slate-600 dark:text-[#A8BAC4] hover:text-ledger-teal dark:hover:text-ledger-teal transition-colors focus-ring rounded py-0.5 cursor-pointer font-medium"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-[#2A3B45]">•</span>
            <button
              type="button"
              onClick={() => handleOpenLegal("terms")}
              className="text-slate-600 dark:text-[#A8BAC4] hover:text-ledger-teal dark:hover:text-ledger-teal transition-colors focus-ring rounded py-0.5 cursor-pointer font-medium"
            >
              Terms of Service
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-[#2A3B45]">•</span>
            <button
              type="button"
              onClick={() => handleOpenLegal("security")}
              className="text-slate-600 dark:text-[#A8BAC4] hover:text-ledger-teal dark:hover:text-ledger-teal transition-colors focus-ring rounded py-0.5 cursor-pointer font-medium"
            >
              Security Standards
            </button>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <MainDashboard />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
