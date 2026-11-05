import React from "react";
import { LayoutDashboard, ReceiptText, PieChart, Sparkles, Plus, LogOut } from "lucide-react";
import { HealthBadge } from "./HealthBadge";
import { useAuth } from "../../context/AuthContext";

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout, loginDemo } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: ReceiptText },
    { id: "budgets", label: "Budgets", icon: PieChart },
    { id: "copilot", label: "AI Copilot", icon: Sparkles },
  ];

  const getUserInitials = (name?: string, email?: string): string => {
    const raw = (name || email || "PP").trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Desktop & Tablet Institutional Top Bar */}
      <header className="sticky top-0 z-40 bg-ledger-surface/95 backdrop-blur-md border-b border-ledger-border px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-ledger mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 group focus-ring rounded-md"
              aria-label="PennyPilot home"
            >
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
            <nav
              className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-ledger-borderSubtle"
              aria-label="Main Navigation"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-ledger-surfaceSubtle text-ledger-ink font-semibold border border-ledger-borderSubtle"
                        : "text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surfaceSubtle/60"
                    } focus-ring`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Currency Indicator (₹ INR) */}
            <div
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded border border-ledger-borderSubtle bg-ledger-surfaceSubtle text-[11px] font-mono text-ledger-inkMuted select-none"
              title="Active ledger currency: Indian Rupee (INR, integer-paise precision)"
              aria-label="Active currency Indian Rupee"
            >
              <span className="font-semibold text-ledger-teal">₹</span>
              <span>{user?.currency || "INR"}</span>
            </div>

            {/* System Health Status Indicator */}
            <HealthBadge />

            {/* Quick Add CTA */}
            <button
              onClick={() => onSelectTab("quick_add")}
              className="btn-primary focus-ring"
              title="Record transaction"
              aria-label="Record transaction"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Quick Add</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* User Identity Presentation */}
            {user ? (
              <div
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md border border-ledger-borderSubtle bg-ledger-surfaceSubtle/60 text-xs"
                title={`Signed in as ${user.display_name || user.email}`}
              >
                <div
                  className="w-5 h-5 rounded bg-ledger-tealLight text-ledger-teal flex items-center justify-center font-mono text-[10px] font-semibold border border-ledger-teal/20 shrink-0 select-none"
                  aria-hidden="true"
                >
                  {getUserInitials(user.display_name, user.email)}
                </div>
                <div className="flex flex-col text-left leading-tight hidden lg:block">
                  <span className="font-medium text-ledger-ink text-[11px] truncate max-w-[110px]">
                    {user.display_name || "Aarav Sharma"}
                  </span>
                  <span className="text-[9px] font-mono text-ledger-inkSubtle truncate max-w-[110px]">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1 rounded text-ledger-inkSubtle hover:text-ledger-red hover:bg-ledger-surface transition-colors focus-ring"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => loginDemo()}
                className="btn-secondary text-xs px-2.5 py-1 min-h-[32px] focus-ring"
                title="Sign in with demo account"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (44px+ touch targets, pb-safe, notch support) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ledger-surface/95 backdrop-blur-md border-t border-ledger-border pb-safe shadow-float"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-4 h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 transition-colors focus-ring ${
                  isActive
                    ? "text-ledger-teal font-semibold"
                    : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
