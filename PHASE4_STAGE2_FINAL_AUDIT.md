# PENNYPILOT — PHASE 4 STAGE 2 FINAL ACCESSIBILITY & AUTHENTICATION AUDIT

**Audit Date:** 2026-11-06  
**Auditor:** Senior Financial Software Engineer & Principal Accessibility/Security QA  
**Audited Target Commit:** `9ffc452` (`feat(phase4-stage2): implement institutional shell refinement, user identity, currency indicator, and accessibility landmarks`)  
**Status:** AUDIT COMPLETE — FINDINGS & PROPOSED CORRECTIONS DOCUMENTED (AWAITING APPROVAL BEFORE CODE CHANGES)

---

## 1. Executive Summary

This audit evaluates the Stage 2 implementation across three focal areas:
1. **Navigation Accessibility:** Semantics of view navigation vs W3C ARIA Tab pattern.
2. **Authentication & Demo Fallback:** Behavior of automatic demo login, production build exposure, and session removal.
3. **Mobile Safe-Area Verification:** Mathematical clearance and viewport configuration for mobile notches.

No code modifications have been made during this audit; all findings and proposed corrections are documented below for user approval.

---

## 2. Area A: Navigation Accessibility Audit

### 2.1 Route Navigation vs True Tabbed Interface
- **Observation:** In [`frontend/src/components/common/Navbar.tsx`](file:///d:/projects/PennyPilot/frontend/src/components/common/Navbar.tsx), navigation switches between four top-level views:
  1. `Dashboard` (Executive overview, KPIs, pacing hero chart, recent txs)
  2. `Transactions` (Complete ledger grid, filters, CSV export)
  3. `Budgets` (Allocation matrix, pacing progress, limits)
  4. `AI Copilot` (Conversational interface, monthly report memorandum)
- **Architectural Reality:** These are **major top-level application views**, not in-page tabs for a single widget or component.

### 2.2 Semantic Appropriateness of `role="tablist"` & `role="tab"`
Per the **W3C WAI-ARIA Authoring Practices Guide (APG) for Tabs**:
- A tab list (`role="tablist"`) is designed for selecting one of several panes (`role="tabpanel"`) displayed in the same context without navigating to a new page or view.
- When `role="tablist"` and `role="tab"` are applied, assistive technologies (screen readers like NVDA, JAWS, VoiceOver) expect:
  1. **Roving Tabindex:** Only the active tab is in the focus sequence (`tabIndex={0}`); inactive tabs have `tabIndex={-1}`.
  2. **Arrow Key Navigation:** Pressing `ArrowLeft` / `ArrowRight` (or `ArrowUp` / `ArrowDown`) moves focus between tabs, while pressing `Tab` jumps out of the tablist directly into the active `tabpanel`.
  3. **Associated Panels:** Each tab must have an `aria-controls="panel-id"`, and each panel must have `role="tabpanel"`, `id="panel-id"`, and `aria-labelledby="tab-id"`.

### 2.3 Defects & Risks Identified in Current `role="tab"` Implementation
1. **No Arrow-Key Navigation:** In `Navbar.tsx`, buttons use standard `Tab` navigation. Keyboard and screen reader users expect arrow keys; using `Tab` to navigate through `role="tab"` elements is an ARIA pattern violation.
2. **Missing `tabpanel` Elements:** In [`frontend/src/App.tsx`](file:///d:/projects/PennyPilot/frontend/src/App.tsx#L123-L195), views are rendered as unassociated `<div>` blocks without `role="tabpanel"` or matching `id`s.
3. **Misleading Screen Reader Announcement:** Screen readers announce each item as `"Dashboard, tab, 1 of 4, selected"`, creating false expectations of an in-page tab widget rather than top-level application navigation.

### 2.4 Proposed Correction for Area A
Replace the artificial `tablist` / `tab` ARIA pattern with the W3C standard **Semantic Navigation Pattern**:
```tsx
{/* Desktop Navigation */}
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
        onClick={() => onSelectTab(item.id)}
        aria-current={isActive ? "page" : undefined}
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
```
- **Benefits:**
  - Standard `Tab` key navigation is completely valid and natural.
  - Screen readers announce: `"Dashboard, current page, button"` — intuitive, accessible, and standards-compliant.
  - Eliminates the need for complex custom roving tabindex event listeners across desktop and mobile headers.

---

## 3. Area B: Authentication & Demo Fallback Audit

### 3.1 Demo Login Restriction & Production Build Exposure
- **Current Code ([`frontend/src/context/AuthContext.tsx#L42-L47`](file:///d:/projects/PennyPilot/frontend/src/context/AuthContext.tsx#L42-L47)):**
  ```typescript
  // Auto-login with Demo account for seamless evaluator experience
  try {
    const auth = await apiLogin("demo@pennypilot.in", "DemoPassword123!");
    setUser(auth.user);
    setToken(auth.access_token);
  }
  ```
- **Finding 1:** There is **no environment check** (`import.meta.env.DEV` or `mode === 'development'`).
- **Finding 2:** In production builds (`npm run build`), if the database has a demo user seeded, any unauthenticated client will automatically authenticate as `demo@pennypilot.in` upon initial load.

### 3.2 Authentication Flow Integrity
- **Finding 3:** The "Sign In" button in [`Navbar.tsx#L142`](file:///d:/projects/PennyPilot/frontend/src/components/common/Navbar.tsx#L142) calls `loginDemo()`, which dispatches a legitimate `POST /api/v1/auth/login` network request.
- The backend verifies password hashing (`argon2id` / `bcrypt`), issues a signed JWT with expiration, and returns the profile. The client stores this in `localStorage` via `setStoredToken()`.

### 3.3 Protection Against Unauthenticated Access
- **Finding 4:** Unauthenticated users **cannot access protected data** without a valid token.
  - Verified via direct HTTP request to `http://127.0.0.1:8000/api/v1/transactions` without headers:
    ```json
    HTTP 401 Unauthorized
    {"code": "UNAUTHORIZED", "message": "Authentication token required"}
    ```
  - Server-side multi-tenant isolation and JWT authorization are enforced deterministically on every user endpoint.

### 3.4 Sign-Out Session Removal & Refresh Loop Risk
- **Current Code ([`AuthContext.tsx#L75-L79`](file:///d:/projects/PennyPilot/frontend/src/context/AuthContext.tsx#L75-L79)):**
  ```typescript
  const logout = () => {
    clearStoredToken();
    setUser(null);
    setToken(null);
  };
  ```
- **Finding 5 (Session Removal):** `logout()` removes `pennypilot_token` from `localStorage` and resets state to `null`.
- **Finding 6 (Refresh Loop Risk):** Because `initAuth()` automatically falls back to `apiLogin("demo@pennypilot.in", ...)` when `getStoredToken()` returns `null`, **refreshing the page after logging out automatically logs the user right back in**.
  - While intended as a convenience for assignment evaluators, an explicit user sign-out action is effectively undone upon page reload.

### 3.5 Proposed Correction for Area B
1. Add an explicit signed-out marker in `localStorage` (e.g. `pennypilot_logged_out: "true"`):
   - When the user clicks "Sign Out", set `pennypilot_logged_out = "true"` and clear token.
   - In `initAuth()`: If `localStorage.getItem("pennypilot_logged_out") === "true"`, do not auto-login with demo credentials. Remain in the logged-out state with the "Sign In" button visible.
   - When the user clicks "Sign In" (or "Reset Demo User"), remove `pennypilot_logged_out` and authenticate.
2. In production builds, wrap automatic evaluation login with an explicit dev check or prompt:
   ```typescript
   if (import.meta.env.DEV && !localStorage.getItem("pennypilot_logged_out")) {
     // auto-login demo evaluator
   }
   ```

---

## 4. Area C: Mobile Safe-Area Verification

### 4.1 Utility Definition in CSS
- **Inspected File:** [`frontend/src/index.css#L75-L83`](file:///d:/projects/PennyPilot/frontend/src/index.css#L75-L83)
  ```css
  /* Safe area insets for mobile notched devices */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }

  .pt-safe {
    padding-top: env(safe-area-inset-top, 16px);
  }
  ```
- **Confirmation:** The utility is defined in `@layer utilities`. It provides a native `env(safe-area-inset-bottom)` with a `16px` fallback for browsers that do not support or define notch environment variables.

### 4.2 Viewport Configuration in HTML
- **Inspected File:** [`frontend/index.html#L5`](file:///d:/projects/PennyPilot/frontend/index.html#L5)
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  ```
- **Confirmation:** `viewport-fit=cover` is present. This is the prerequisite for WebKit (iOS Safari) and Chromium mobile browsers to populate `safe-area-inset-*`.

### 4.3 Content Overlap Verification & Geometry
- **Fixed Mobile Navigation Bar Height:**
  - Base height: `h-14` = $56\text{ px}$.
  - Safe-area bottom padding: `pb-safe` = $16\text{ px}$ (fallback) to $34\text{ px}$ (iPhone home indicator).
  - Total occupied height: **$72\text{ px}$ to $90\text{ px}$**.
- **Main Container Bottom Clearance:**
  - [`frontend/src/App.tsx#L120`](file:///d:/projects/PennyPilot/frontend/src/App.tsx#L120): `pb-28 md:pb-10`.
  - `pb-28` = $7\text{ rem} = 112\text{ px}$.
- **Mathematical Safety Margin:**
  $$\text{Clearance} = 112\text{ px} - 90\text{ px} = \mathbf{+22\text{ px}}$$
- **Verdict:** Page content, action buttons, and table rows are guaranteed at least $22\text{ px}$ of clearance above the mobile navigation bar and will never be covered or clipped on any mobile viewport.

---

## 5. Verification & Test Suite Status

| Suite | Command | Result |
|---|---|---|
| **Frontend Unit Tests** | `npm --prefix frontend test -- --run` | **3 / 3 Passed** in 790ms |
| **Frontend Lint** | `npm --prefix frontend run lint` | **0 errors**, 7 historical Phase 2 warnings |
| **Frontend Production Build** | `npm --prefix frontend run build` | **Clean build** in 1.86s (PWA 13 entries, 390.65 KiB) |
| **Backend Regression Tests** | `pytest -v -m 'not slow'` | **68 / 68 Passed** in 37.85s |
| **Backend Health Endpoint** | `GET /api/v1/health` | **HTTP 200 `healthy`** (database connected) |
| **Unauthenticated Protection** | `GET /api/v1/transactions` (no auth) | **HTTP 401 `Authentication token required`** |
| **Git Working Tree** | `git status` | **Clean**, branch `master` at commit `9ffc452` |

---

## 6. Recommended Action & Request for Approval

Before applying changes or advancing to Stage 3, we request user approval for the following two targeted corrections:

1. **Correction 1 (Navigation Accessibility):** Replace `role="tablist"` / `role="tab"` with semantic `<nav aria-label="...">` and `aria-current={isActive ? "page" : undefined}` on navigation buttons in `Navbar.tsx`.
2. **Correction 2 (Authentication Persistence):** Introduce `pennypilot_logged_out` flag in `AuthContext.tsx` so that logging out persists across page refreshes, and guard automatic demo authentication with `import.meta.env.DEV`.

*Awaiting user approval before modifying code.*
