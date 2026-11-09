import React, { useState } from "react";
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  BarChart3,
  Tags,
  Sparkles,
  Lightbulb,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Shield,
  FileText,
  Lock,
  ChevronRight,
} from "lucide-react";
import { PennyPilotLogo } from "./PennyPilotLogo";
import { ProfileDropdown } from "./ProfileDropdown";
import { NotificationsPopover } from "./NotificationsPopover";
import { useAuth } from "../../context/AuthContext";
import { GlassIcon } from "./GlassIcon";

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
  onOpenLegal?: (doc: "privacy" | "terms" | "security") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenProfile,
  onOpenAuth,
  onOpenLegal,
}) => {
  const { user, logout } = useAuth();
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const desktopNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: ReceiptText },
    { id: "budgets", label: "Budgets", icon: PieChart },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "insights", label: "Insights", icon: Lightbulb },
    { id: "categories", label: "Categories", icon: Tags },
    { id: "copilot", label: "AI Copilot", icon: Sparkles },
  ];

  const mobilePrimaryTabs = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "transactions", label: "Ledger", icon: ReceiptText },
    { id: "budgets", label: "Budgets", icon: PieChart },
    { id: "analytics", label: "Trends", icon: BarChart3 },
  ];

  const isMoreTabActive = currentTab === "insights" || currentTab === "categories" || currentTab === "copilot" || currentTab === "settings" || ["privacy", "terms", "security"].includes(currentTab);

  const handleMobileSelect = (tab: string) => {
    onSelectTab(tab);
    setIsMobileMoreOpen(false);
  };

  const handleMobileLegal = (doc: "privacy" | "terms" | "security") => {
    if (onOpenLegal) {
      onOpenLegal(doc);
    } else {
      onSelectTab(doc);
    }
    setIsMobileMoreOpen(false);
  };

  return (
    <>
      {/* Top Institutional Top Bar (Desktop & Mobile Header) - Fixed on scroll, translucent frosted background (~92% opacity) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/92 dark:bg-[#101820]/92 backdrop-blur-md border-b border-slate-200/80 dark:border-[#2A3B45]/80 px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-12 py-2.5 sm:py-3 min-h-[66px] sm:min-h-[70px] flex items-center shadow-xs transition-colors">
        <div className="max-w-ledger w-full mx-auto flex items-center justify-between gap-3 sm:gap-4 min-w-0">
          {/* GROUP 1: Official Logo & PennyPilot Branding (Enlarged) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 select-none">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab("dashboard");
              }}
              className="flex items-center gap-2.5 group focus-ring rounded-xl select-none"
              aria-label="PennyPilot home"
            >
              <PennyPilotLogo variant="full" size="md" />
            </a>
          </div>

          {/* GROUP 2: Primary Navigation (Dashboard, Transactions, Budgets, Analytics, Insights, Categories, AI Copilot) */}
          <nav
            className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0"
            aria-label="Primary Navigation"
          >
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs xl:text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs dark:bg-teal-500/15 dark:text-teal-300 dark:border dark:border-teal-400/30 dark:shadow-[0_0_12px_rgba(45,212,191,0.2)] font-semibold"
                      : "text-slate-600 dark:text-ledger-inkMuted hover:text-slate-900 dark:hover:text-ledger-ink hover:bg-slate-100/70 dark:hover:bg-white/5"
                  } focus-ring whitespace-nowrap cursor-pointer`}
                >
                  <Icon className="w-3.5 h-3.5 xl:w-[15px] xl:h-[15px] shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* GROUP 4: Notification Bell & Modern Profile Menu */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Notification Bell Dropdown (Tips, signals, and alerts) */}
            <NotificationsPopover />

            {/* Modern Profile Avatar Dropdown */}
            {user ? (
              <ProfileDropdown
                onOpenProfile={onOpenProfile || (() => {})}
                onOpenSettings={() => onSelectTab("settings")}
              />
            ) : (
              <button
                onClick={onOpenAuth}
                className="btn-primary text-xs sm:text-sm px-4 py-2 min-h-[40px] focus-ring shrink-0 font-medium shadow-xs"
                title="Sign in or register"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (5 clean destinations, >= 44px touch targets, translucent frosted surface, zero clipping) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-[#101820]/92 backdrop-blur-md border-t border-slate-200/80 dark:border-[#2A3B45]/80 pb-safe shadow-float select-none transition-colors"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-5 h-14">
          {mobilePrimaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                onClick={() => handleMobileSelect(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 transition-colors focus-ring ${
                  isActive
                    ? "text-ledger-teal font-bold"
                    : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.5]" : ""}`} aria-hidden="true" />
                <span className="text-[10px] font-medium leading-none tracking-tight">
                  {item.label}
                </span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-ledger-teal mt-0.5" />}
              </button>
            );
          })}

          {/* 5th Mobile Tab: "More" Menu Trigger */}
          <button
            type="button"
            aria-label="More navigation options"
            aria-expanded={isMobileMoreOpen}
            onClick={() => setIsMobileMoreOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 transition-colors focus-ring ${
              isMoreTabActive || isMobileMoreOpen
                ? "text-ledger-teal font-bold"
                : "text-ledger-inkMuted hover:text-ledger-ink"
            }`}
          >
            <Menu className={`w-4 h-4 ${isMoreTabActive ? "stroke-[2.5]" : ""}`} aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none tracking-tight">More</span>
            {isMoreTabActive && <span className="w-1.5 h-1.5 rounded-full bg-ledger-teal mt-0.5" />}
          </button>
        </div>
      </nav>

      {/* Accessible Mobile "More" Slide-up Drawer / Modal */}
      {isMobileMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Additional Navigation Options"
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileMoreOpen(false)}
        >
          <div
            className="bg-white dark:bg-[#121C28] border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 shadow-modal space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PennyPilotLogo variant="symbol" size="xs" />
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">PennyPilot Hub</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Secondary Modules */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                Features & Intelligence
              </span>
              <button
                type="button"
                onClick={() => handleMobileSelect("insights")}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all min-h-[48px] ${
                  currentTab === "insights"
                    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800/60"
                    : "text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GlassIcon icon={Lightbulb} variant="amber" size="xs" />
                  <div className="text-left">
                    <span className="text-xs font-semibold block text-slate-900 dark:text-slate-100">Financial Insights</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Deterministic signals & anomaly detection</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => handleMobileSelect("categories")}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all min-h-[48px] ${
                  currentTab === "categories"
                    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800/60"
                    : "text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GlassIcon icon={Tags} variant="indigo" size="xs" />
                  <div className="text-left">
                    <span className="text-xs font-semibold block text-slate-900 dark:text-slate-100">Category Management</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Custom icons, colors & taxonomy</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => handleMobileSelect("copilot")}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all min-h-[48px] ${
                  currentTab === "copilot"
                    ? "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800/60"
                    : "text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GlassIcon icon={Sparkles} variant="teal" size="xs" />
                  <div className="text-left">
                    <span className="text-xs font-semibold block text-slate-900 dark:text-slate-100">AI Copilot</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Grounded financial insights</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </button>

              {user && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      onOpenProfile?.();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all min-h-[48px] border border-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <GlassIcon icon={UserIcon} variant="slate" size="xs" />
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-slate-900 dark:text-slate-100">Edit Profile</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Avatar, name, age & details</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      onSelectTab("settings");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-slate-800 dark:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all min-h-[48px] border border-transparent"
                  >
                    <div className="flex items-center gap-3">
                      <GlassIcon icon={UserIcon} variant="teal" size="xs" />
                      <div className="text-left">
                        <span className="text-xs font-semibold block text-slate-900 dark:text-slate-100">Settings</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Theme, currency & account</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </button>
                </>
              )}
            </div>

            {/* Legal & Standards */}
            <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                Standards & Governance
              </span>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleMobileLegal("privacy")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-center min-h-[44px] transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-tight">Privacy</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMobileLegal("terms")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-center min-h-[44px] transition-colors"
                >
                  <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-tight">Terms</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMobileLegal("security")}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-center min-h-[44px] transition-colors"
                >
                  <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-tight">Security</span>
                </button>
              </div>
            </div>

            {/* Logout on Mobile */}
            {user && (
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 min-h-[44px] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of PennyPilot</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
