import React from "react";
import { ArrowLeft, Shield, FileText, Lock, ChevronRight } from "lucide-react";

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  currentDoc: "privacy" | "terms" | "security";
  onSelectDoc: (doc: "privacy" | "terms" | "security") => void;
  onBackToDashboard: () => void;
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  currentDoc,
  onSelectDoc,
  onBackToDashboard,
  children,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumbs & Document Switcher Toolbar */}
      <nav
        aria-label="Legal document navigation"
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white/95 dark:bg-[#121C28]/95 backdrop-blur-md rounded-2xl border border-ledger-border shadow-sm"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-ledger-ink bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-ledger-border transition-colors focus-ring cursor-pointer"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-ledger-inkMuted ml-2">
            <span
              className="cursor-pointer hover:text-ledger-ink transition-colors"
              onClick={onBackToDashboard}
            >
              PennyPilot
            </span>
            <ChevronRight className="w-3 h-3 text-ledger-inkSubtle" />
            <span className="font-medium text-ledger-ink">Legal & Compliance</span>
          </div>
        </div>

        {/* Document Selector Pills */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-ledger-border text-xs font-medium">
          <button
            type="button"
            onClick={() => onSelectDoc("privacy")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentDoc === "privacy"
                ? "bg-white dark:bg-[#192633] text-ledger-teal font-semibold shadow-sm border border-ledger-border"
                : "text-ledger-inkMuted hover:text-ledger-ink"
            }`}
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => onSelectDoc("terms")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentDoc === "terms"
                ? "bg-white dark:bg-[#192633] text-ledger-teal font-semibold shadow-sm border border-ledger-border"
                : "text-ledger-inkMuted hover:text-ledger-ink"
            }`}
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => onSelectDoc("security")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentDoc === "security"
                ? "bg-white dark:bg-[#192633] text-ledger-teal font-semibold shadow-sm border border-ledger-border"
                : "text-ledger-inkMuted hover:text-ledger-ink"
            }`}
          >
            Security
          </button>
        </div>
      </nav>

      {/* Main Legal Document Card */}
      <article className="bg-white dark:bg-[#121C28] border border-ledger-border shadow-card rounded-3xl p-6 sm:p-10 md:p-12 space-y-8 text-ledger-ink">
        <header className="border-b border-ledger-border pb-6 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-ledger-inkMuted border border-ledger-border">
            {currentDoc === "privacy" && <FileText className="w-3.5 h-3.5 text-ledger-teal" />}
            {currentDoc === "terms" && <Shield className="w-3.5 h-3.5 text-ledger-teal" />}
            {currentDoc === "security" && <Lock className="w-3.5 h-3.5 text-ledger-teal" />}
            <span>Official Policy Document</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-ledger-ink">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-ledger-inkMuted leading-relaxed font-sans">
            {subtitle}
          </p>
          <div className="pt-2 text-xs font-mono text-ledger-inkSubtle">
            Last updated: {lastUpdated}
          </div>
        </header>

        {/* Document Content Sections */}
        <div className="space-y-8 text-ledger-ink">{children}</div>

        {/* Document Footer */}
        <footer className="pt-8 border-t border-ledger-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-ledger-inkSubtle">
          <div>
            PennyPilot Financial Operating System • All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onSelectDoc("privacy")}
              className="hover:text-ledger-teal hover:underline cursor-pointer"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onSelectDoc("terms")}
              className="hover:text-ledger-teal hover:underline cursor-pointer"
            >
              Terms
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onSelectDoc("security")}
              className="hover:text-ledger-teal hover:underline cursor-pointer"
            >
              Security
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
};
