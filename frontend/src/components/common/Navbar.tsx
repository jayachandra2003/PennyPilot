import { LayoutDashboard, ReceiptText, PieChart, Sparkles, PlusCircle } from "lucide-react";
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
    { id: "copilot", label: "Copilot", icon: Sparkles },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Bar */}
      <header className="sticky top-0 z-40 bg-ledger-surface/90 backdrop-blur-md border-b border-ledger-border px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group focus-ring rounded-lg">
              <div className="w-9 h-9 rounded-xl bg-ledger-teal flex items-center justify-center text-white shadow-sm">
                <span className="font-serif font-bold text-lg leading-none">P</span>
              </div>
              <div>
                <span className="font-serif font-semibold text-lg tracking-tight text-ledger-ink group-hover:text-ledger-teal transition-colors">
                  PennyPilot
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-medium tracking-wider uppercase text-ledger-inkSubtle bg-ledger-bg px-1.5 py-0.5 rounded border border-ledger-border">
                  Quiet Ledger
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-ledger-bg text-ledger-teal font-semibold shadow-hairline"
                        : "text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-bg/50"
                    } focus-ring`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <HealthBadge />
            <button
              onClick={() => onSelectTab("quick_add")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold bg-ledger-teal text-white hover:bg-ledger-tealHover transition-colors shadow-sm focus-ring"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Add</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (44px+ touch targets, pb-safe) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-ledger-surface/95 backdrop-blur-md border-t border-ledger-border pb-safe">
        <div className="grid grid-cols-4 h-16">
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
                <Icon className="w-5 h-5" />
                <span className="text-[11px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
