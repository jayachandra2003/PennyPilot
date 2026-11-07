import React from "react";
import { LegalLayout } from "./LegalLayout";

interface LegalDocProps {
  onSelectDoc: (doc: "privacy" | "terms" | "security") => void;
  onBackToDashboard: () => void;
}

export const PrivacyPolicy: React.FC<LegalDocProps> = ({
  onSelectDoc,
  onBackToDashboard,
}) => {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How PennyPilot collects, stores, processes, and protects your financial ledger data."
      lastUpdated="November 7, 2026"
      currentDoc="privacy"
      onSelectDoc={onSelectDoc}
      onBackToDashboard={onBackToDashboard}
    >
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          1. Information We Collect
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          PennyPilot collects only the data necessary to provide accurate expense tracking, budgeting, and financial intelligence:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <li>
            <strong className="text-slate-900 dark:text-slate-100">Account Credentials:</strong> Email address, display name, salted bcrypt password hash (for email/password accounts), and linked Google OAuth account identity (Google ID and verified email). We never store plaintext passwords.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-100">Ledger Transactions:</strong> Amounts (stored strictly as integer paise, where ₹1.00 = 100 paise), transaction dates, descriptions, merchant names, category assignments, and optional notes.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-100">Budgetary Allocations:</strong> Monthly category limits, active target figures, and financial goals configured by you.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-100">Session Identifiers:</strong> Randomly generated cryptographic session tokens stored in secure, HttpOnly, SameSite cookies to maintain your login status.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          2. How Information is Stored & Processed
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          Your records are stored in a dedicated relational SQLite database with strict multi-tenant user isolation. Every database query enforces <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">user_id</code> filtering at the query boundary. No cross-tenant access is permitted.
        </p>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          All financial arithmetic (totals, savings rate, budget pace projections, anomaly detection, and historical aggregations) is performed exclusively using deterministic, pure Python functions. The database never performs floating-point financial arithmetic.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          3. Artificial Intelligence & External Model Providers
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          PennyPilot adheres to a strict <em>"Compute, Then Explain"</em> architectural constitution:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <li>
            <strong className="text-slate-900 dark:text-slate-100">Zero Calculation Hallucination:</strong> Language models are never used to compute financial aggregates, calculate balances, or determine pacing. Arithmetic is computed deterministically in code first.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-100">FactBundle Verification:</strong> When you converse with the AI Copilot, only verified numeric fact summaries (the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">FactBundle</code>) are passed to the language model to synthesize natural language explanations.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-100">Provider Fallback Chain:</strong> PennyPilot routes requests through a 3-tier fallback pipeline (Hosted LLM API → Local Ollama on localhost → Deterministic Rule Engine). When local Ollama or rule engine is active, zero data leaves your host machine.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-100">No Model Training:</strong> Your financial data is not used to train or fine-tune public machine learning models.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          4. Data Retention, Permanent Deletion & Backup Policy
        </h2>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          Transactions deleted in the application are soft-deleted (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">deleted_at</code> timestamp) to maintain ledger auditability and prevent dangling financial references. Categories can be soft-archived, preserving historical ledger associations.
        </p>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-100">Permanent Account Deletion:</strong> You may permanently delete your account at any time via <span className="font-semibold text-slate-900 dark:text-slate-100">Settings → Account & Security</span> by typing the exact confirmation phrase <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">DELETE MY ACCOUNT</code> and verifying your password or active authentication session.
        </p>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-100">Active Database Purging:</strong> Upon confirmed deletion, all records belonging to you—including transactions, category allocations, monthly budgets, recurring schedules, financial goals, insights, notifications, OAuth account linkages, active and historical sessions, and uploaded avatar images—are immediately and permanently purged from the active relational database and local file storage in an atomic transaction. Other users' records and application default categories are strictly preserved.
        </p>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-100">Disaster-Recovery Backups:</strong> Point-in-time database snapshots created solely for system disaster recovery and business continuity are retained in encrypted cold storage for up to 30 days, after which they are systematically overwritten and permanently purged. Historical backups are never used to restore or resurrect accounts that have been intentionally deleted.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          5. Cookies & Local Storage
        </h2>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          PennyPilot uses cookies strictly for essential authentication and session security:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <li><code className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">pennypilot_session</code>: HttpOnly, SameSite=Lax authentication cookie.</li>
          <li><code className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">pennypilot_csrf</code>: Double-submit CSRF prevention cookie.</li>
          <li><code className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">localStorage</code>: Remembers local UI preferences (such as PWA install banner dismissal). No financial records or authentication secrets are stored in localStorage.</li>
        </ul>
      </section>
    </LegalLayout>
  );
};
