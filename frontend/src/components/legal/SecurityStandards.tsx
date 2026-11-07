import React from "react";
import { LegalLayout } from "./LegalLayout";

interface LegalDocProps {
  onSelectDoc: (doc: "privacy" | "terms" | "security") => void;
  onBackToDashboard: () => void;
}

export const SecurityStandards: React.FC<LegalDocProps> = ({
  onSelectDoc,
  onBackToDashboard,
}) => {
  return (
    <LegalLayout
      title="Security Standards & Architecture"
      subtitle="Detailed overview of technical security controls, cryptographic measures, and data protections implemented in PennyPilot."
      lastUpdated="November 7, 2026"
      currentDoc="security"
      onSelectDoc={onSelectDoc}
      onBackToDashboard={onBackToDashboard}
    >
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          1. Authentication & Password Security
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Bcrypt Password Hashing:</strong> User passwords are encrypted with bcrypt using 12 salt rounds before storage. Plaintext passwords are never logged, cached, or persisted.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Google OAuth 2.0 / OIDC:</strong> Integration supports OpenID Connect authorization code flow with PKCE code challenges, cryptographic <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">state</code> and <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">nonce</code> verification, Google JWKS RSA key signature verification, audience checking, and issuer validation.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Server-Side Session Lifecycle:</strong> Sessions utilize cryptographically random 256-bit entropy tokens, stored server-side in the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">user_sessions</code> table. Active sessions feature 7-day idle timeouts, server-side revocation on logout, and single-click "Revoke All Sessions" capability.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          2. API & Network Protections
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Cross-Site Request Forgery (CSRF):</strong> All state-changing endpoints (<code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">POST</code>, <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">PUT</code>, <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">PATCH</code>, <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">DELETE</code>) require matching CSRF header tokens (<code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">X-CSRF-Token</code>) against validated server session records.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Safe Cookie Configuration:</strong> Authentication cookies are marked with <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">HttpOnly</code> (blocking JavaScript XSS theft), <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">SameSite=Lax</code>, and <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">Secure</code> flags in production.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">CORS Boundary:</strong> Backend CORS middleware strictly restricts origin headers to authorized application domains; wildcards (<code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">*</code>) are prohibited.
          </li>
          <li>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">Safe Error Handling:</strong> Unhandled exceptions are intercepted by centralized handlers that return sanitized error messages and unique request IDs. Internal stack traces, SQL queries, and server file paths are never exposed to clients.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          3. Multi-Tenant User Isolation
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          PennyPilot enforces multi-tenant row-level access controls server-side. Every query for user-owned records (transactions, categories, budgets, insights) strictly filters on authenticated <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">user_id</code>. Authorization is evaluated by dependency injection before reaching domain logic. Client-supplied IDs are never trusted blindly.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          4. Financial Data Integrity
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          All financial amounts are stored, manipulated, and aggregated in integer <strong>paise</strong> (₹1.00 = 100 paise). Floating-point representations (<code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">float</code>) are strictly prohibited from database columns, schemas, and domain calculation functions, eliminating IEEE 754 floating-point rounding errors.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          5. PWA Service Worker Caching Boundary
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          The PennyPilot Progressive Web App Service Worker caches <em>only</em> the static application shell (HTML, CSS, JavaScript, fonts, icons). It is strictly configured with a fallback denylist (<code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-mono text-xs border border-slate-200 dark:border-slate-700">navigateFallbackDenylist: [/^\/api/]</code>) to ensure that authenticated financial API responses, JWT tokens, and ledger data are <strong>never</strong> cached in the browser's Service Worker cache.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-white/10 pb-2">
          6. Account Deletion, Session Revocation & Data Purging
        </h2>
        <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          Permanent account deletion operations are authenticated via strict multi-factor criteria: an exact case-sensitive confirmation phrase, password re-authentication (or active Google session validation), and CSRF token verification. Deletion is executed in an isolated atomic database transaction that cascades through all user-scoped tables, permanently deleting transactions, budgets, categories, insights, and session records, and removing user-uploaded profile avatars from local storage with zero orphaned artifacts.
        </p>
      </section>

      <section className="space-y-3">
        <div className="p-4 sm:p-5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Known Architecture Limitations
          </h3>
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            PennyPilot runs on SQLite in Write-Ahead Logging (WAL) mode. In local development or self-hosted deployment, database files at rest on disk are not encrypted by default unless placed on an encrypted volume (e.g. BitLocker or LUKS). Ensure server host volumes are secured appropriately.
          </p>
        </div>
      </section>
    </LegalLayout>
  );
};
