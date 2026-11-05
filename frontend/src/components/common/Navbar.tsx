import React from "react";
import { LayoutDashboard, ReceiptText, PieChart, Sparkles, Plus } from "lucide-react";
import { HealthBadge } from "./HealthBadge";

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: ReceiptText },
    { id: "budgets", label: "Budgets", icon: PieChart },
    { id: "copilot", label: "AI Copilot", icon: Sparkles },
  ];

  return (
    <>
      {/* Desktop & Tablet Institutional Top Bar */}
      <header className="sticky top-0 z-40 bg-ledger-surface/95 backdrop-blur-md border-b border-ledger-border px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-ledger mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 group focus-ring rounded-md">
              <div className="w-7 h-7 rounded-md bg-ledger-teal flex items-center justify-center text-white shadow-subtle shrink-0">
                <span className="font-serif font-bold text-base leading-none">P</span>
              </div>
              <div className="flex items-center">
                <span className="font-serif font-semibold text-base sm:text-lg tracking-tight text-ledger-ink group-hover:text-ledger-teal transition-colors">
                  PennyPilot
                </span>
                <span className="hidden sm:inline-block ml-2 text-[9px] font-mono tracking-widest uppercase text-ledger-inkMuted bg-ledger-surfaceSubtle px-1.5 py-0.5 rounded border border-ledger-borderSubtle">
                  Quiet Ledger
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-6 pl-4 border-l border-ledger-borderSubtle">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-ledger-surfaceSubtle text-ledger-ink font-semibold border border-ledger-borderSubtle"
                        : "text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surfaceSubtle/60"
                    } focus-ring`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <HealthBadge />
            <button
              onClick={() => onSelectTab("quick_add")}
              className="btn-primary focus-ring"
              title="Record transaction"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Add</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (44px+ touch targets, pb-safe) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ledger-surface/95 backdrop-blur-md border-t border-ledger-border pb-safe">
        <div className="grid grid-cols-4 h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors ${
                  isActive ? "text-ledger-teal font-semibold" : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
