/**
 * Production-ready API client for PennyPilot backend.
 * Uses configurable base URL and handles offline/network errors gracefully.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || "";

export interface SystemHealth {
  status: "healthy" | "degraded" | "unreachable";
  service: string;
  version: string;
  environment: string;
  database: string;
  ai_tier_availability: {
    tier_1_hosted: boolean;
    tier_2_local_ollama: boolean;
    tier_3_deterministic_fallback: boolean;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  timezone: string;
  currency: string;
  avatar_url?: string | null;
  email_verified?: boolean;
  onboarding_completed?: boolean;
  tutorial_completed?: boolean;
  monthly_savings_target_paise?: number | null;
  is_active?: boolean;
  has_password?: boolean;
  linked_providers?: string[];
  created_at: string;
}

export interface AuthResponse {
  access_token?: string;
  token_type?: string;
  user: UserProfile;
  message?: string;
  email_verification_required?: boolean;
  email_dispatched?: boolean;
  smtp_configured?: boolean;
}

export interface CategoryItem {
  id: string;
  user_id: string;
  name: string;
  kind: "expense" | "income";
  icon: string;
  color_token: string;
  is_archived: boolean;
  sort_order: number;
  transaction_count?: number;
  has_active_budget?: boolean;
  is_default?: boolean;
}

export interface TransactionItem {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  kind: "expense" | "income";
  amount_paise: number;
  amount_rupees: number;
  formatted_amount: string;
  occurred_on: string;
  description: string;
  merchant?: string;
  note?: string;
  source: "manual" | "nl" | "csv";
  nl_original_text?: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedDraftItem {
  amount_paise: number;
  amount_rupees: number;
  formatted_amount: string;
  occurred_on: string;
  description: string;
  category_id?: string;
  category_name: string;
  kind: "expense" | "income";
  source: "nl";
  nl_original_text: string;
  confidence: number;
  needs_review: boolean;
}

export interface NLParseResponse {
  raw_text: string;
  drafts: ParsedDraftItem[];
  parser_tier: string;
}

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  total_paise: number;
  total_rupees: number;
  formatted_total: string;
  percentage: number;
  transaction_count: number;
}

export interface YearlyMonthTrajectory {
  month: number;
  month_name: string;
  income_paise: number;
  income_formatted: string;
  expense_paise: number;
  expense_formatted: string;
  net_balance_paise: number;
  net_balance_formatted: string;
  savings_rate_percent: number;
  transaction_count: number;
}

export interface MonthlySummary {
  period?: "monthly" | "yearly";
  year: number;
  month?: number | null;
  first_day: string;
  last_day: string;
  total_days: number;
  transaction_count: number;
  income_paise: number;
  income_formatted: string;
  expense_paise: number;
  expense_formatted: string;
  net_balance_paise: number;
  net_balance_formatted: string;
  savings_rate_percent: number;
  category_breakdown: CategoryBreakdownItem[];
  monthly_trajectory?: YearlyMonthTrajectory[];
}

export interface HistoricalMonthSummary {
  year: number;
  month: number;
  month_name: string;
  month_short: string;
  first_day: string;
  last_day: string;
  total_days: number;
  transaction_count: number;
  is_empty: boolean;
  income_paise: number;
  income_formatted: string;
  expense_paise: number;
  expense_formatted: string;
  net_balance_paise: number;
  net_balance_formatted: string;
  savings_rate_percent: number;
  category_breakdown: CategoryBreakdownItem[];
  expense_mom_delta_paise?: number | null;
  expense_mom_delta_formatted?: string | null;
  expense_mom_pct?: number | null;
  income_mom_delta_paise?: number | null;
  income_mom_delta_formatted?: string | null;
  income_mom_pct?: number | null;
  savings_rate_mom_delta?: number | null;
}

export interface HistoricalAnalyticsOverall {
  total_income_paise: number;
  total_income_formatted: string;
  total_expense_paise: number;
  total_expense_formatted: string;
  total_net_savings_paise: number;
  total_net_savings_formatted: string;
  average_monthly_income_paise: number;
  average_monthly_income_formatted: string;
  average_monthly_expense_paise: number;
  average_monthly_expense_formatted: string;
  average_monthly_savings_paise: number;
  average_monthly_savings_formatted: string;
  overall_savings_rate_percent: number;
  months_count: number;
  active_months_count: number;
  top_categories: CategoryBreakdownItem[];
}

export interface HistoricalAnalyticsResponse {
  months: HistoricalMonthSummary[];
  overall: HistoricalAnalyticsOverall;
}

export interface BudgetPace {
  spent_paise: number;
  spent_formatted: string;
  limit_paise: number;
  limit_formatted: string;
  remaining_paise: number;
  remaining_formatted: string;
  overrun_paise: number;
  overrun_formatted: string;
  utilization_percent: number;
  is_over_budget: boolean;
  as_of_date: string;
  total_days: number;
  elapsed_days: number;
  remaining_days: number;
  target_pace_paise: number;
  target_pace_formatted: string;
  projected_total_paise: number;
  projected_total_formatted: string;
  projected_overrun_paise: number;
  projected_overrun_formatted: string;
  status: "on_track" | "caution" | "over_pace" | "over_budget";
  verdict_sentence: string;
}

export interface CategoryBudgetStatus {
  category_id: string;
  category_name: string;
  icon: string;
  color_token: string;
  limit_paise: number;
  limit_formatted: string;
  spent_paise: number;
  spent_formatted: string;
  remaining_paise: number;
  remaining_formatted: string;
  utilization_percent: number;
  status: "on_track" | "caution" | "over_pace" | "over_budget" | "no_budget" | "unbudgeted";
}

export interface MonthlyBudgetOverview {
  month: string;
  total_limit_paise: number;
  total_limit_formatted: string;
  total_spent_paise: number;
  total_spent_formatted: string;
  remaining_paise: number;
  remaining_formatted: string;
  utilization_percent: number;
  category_budgets: CategoryBudgetStatus[];
}

export interface AnomalyItem {
  transaction_id: string;
  description: string;
  date: string;
  amount_paise: number;
  amount_formatted: string;
  baseline_median_paise: number;
  baseline_median_formatted: string;
  modified_z_score: number;
  multiple_of_median: number;
  evidence: string;
}

export interface AnomalyReport {
  status: string;
  sample_size?: number;
  baseline_median_paise?: number;
  baseline_median_formatted?: string;
  mad_paise?: number;
  anomalies_count: number;
  anomalies: AnomalyItem[];
}

// Token helper
export function getStoredToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return localStorage.getItem("pennypilot_token");
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.setItem("pennypilot_token", token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  localStorage.removeItem("pennypilot_token");
}

export const LOGGED_OUT_KEY = "pennypilot_logged_out";

export function isExplicitlyLoggedOut(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  return localStorage.getItem(LOGGED_OUT_KEY) === "true";
}

export function setExplicitlyLoggedOut(loggedOut: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (loggedOut) {
    localStorage.setItem(LOGGED_OUT_KEY, "true");
  } else {
    localStorage.removeItem(LOGGED_OUT_KEY);
  }
}

export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)pennypilot_csrf=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const csrf = getCsrfToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (csrf) {
    headers["X-CSRF-Token"] = csrf;
  }
  return headers;
}

// Extended to 60 seconds to comfortably accommodate Render Free tier container spin-up (35-50s cold-start)
const DEFAULT_TIMEOUT_MS = 60000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      signal: options.signal || controller.signal,
    });
    return res;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw new Error(err.message || "Network error. Please check your connection.");
  } finally {
    clearTimeout(timeoutId);
  }
}

// API functions
export async function fetchHealth(): Promise<SystemHealth> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: "unreachable",
      service: "PennyPilot",
      version: "0.1.0",
      environment: "local",
      database: "disconnected",
      ai_tier_availability: {
        tier_1_hosted: false,
        tier_2_local_ollama: false,
        tier_3_deterministic_fallback: true,
      },
    };
  }
}

async function extractErrorMessage(res: Response, defaultMessage: string): Promise<string> {
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return "Backend server is currently unavailable. Please verify the backend service is running.";
  }

  try {
    const data = await res.json();
    if (data.field_errors && Array.isArray(data.field_errors) && data.field_errors.length > 0) {
      return data.field_errors.map((f: any) => f.message || f.detail).filter(Boolean).join(". ");
    }
    if (data.message && typeof data.message === "string") {
      return data.message;
    }
    if (data.detail && typeof data.detail === "string") {
      return data.detail;
    }
    if (data.code === "EMAIL_ALREADY_EXISTS") {
      return "An account with this email already exists. Please sign in instead.";
    }
    if (data.code === "INVALID_CREDENTIALS") {
      return "Invalid email or password.";
    }
  } catch {
    // Non-JSON response
  }

  if (res.status === 401) {
    return "Invalid email or password.";
  }
  if (res.status === 400 || res.status === 409) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (res.status >= 500) {
    return "Server encountered an error. Please try again later.";
  }

  return defaultMessage;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Invalid email or password");
    throw new Error(message);
  }
  const data: AuthResponse = await res.json();
  if (data.access_token) {
    setStoredToken(data.access_token);
  }
  return data;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  display_name: string;
  timezone?: string;
  currency?: string;
}): Promise<AuthResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to create account. Please check your details.");
    throw new Error(message);
  }
  const data: AuthResponse = await res.json();
  if (data.access_token) {
    setStoredToken(data.access_token);
  }
  return data;
}

export async function verifyEmail(token: string): Promise<{ status: string; message: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to verify email. The link may be expired or invalid.");
    throw new Error(message);
  }
  return await res.json();
}

export async function resendVerification(email: string): Promise<{ status: string; message: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/resend-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to resend verification email.");
    throw new Error(message);
  }
  return await res.json();
}

export async function forgotPassword(email: string): Promise<{ status: string; message: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to request password reset.");
    throw new Error(message);
  }
  return await res.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to reset password. Link may be expired or invalid.");
    throw new Error(message);
  }
  return await res.json();
}

export async function fetchCurrentUser(): Promise<UserProfile> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent("pennypilot:auth_expired"));
    }
    throw new Error("Unauthorized");
  }
  return await res.json();
}

export async function apiLogout(): Promise<void> {
  try {
    await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {
    // Non-fatal if backend session already expired or network down
  } finally {
    clearStoredToken();
  }
}

export async function updateUserProfile(payload: {
  display_name?: string;
  timezone?: string;
  currency?: string;
}): Promise<UserProfile> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update profile");
  }
  return await res.json();
}

export async function uploadAvatar(file: File): Promise<UserProfile> {
  const token = getStoredToken();
  const csrf = getCsrfToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (csrf) {
    headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/me/avatar`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to upload avatar");
  }
  return await res.json();
}

export async function deleteAvatar(): Promise<UserProfile> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/me/avatar`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to remove avatar");
  }
  return await res.json();
}

export function getAvatarImageUrl(user: UserProfile | null, token: string | null): string | null {
  if (!user || !user.avatar_url) return null;
  const baseUrl = `${API_BASE_URL}/auth/me/avatar`;
  if (token) {
    return `${baseUrl}?token=${encodeURIComponent(token)}`;
  }
  return baseUrl;
}

export async function fetchCategories(includeArchived: boolean = false): Promise<CategoryItem[]> {
  const url = `${API_BASE_URL}/categories${includeArchived ? "?include_archived=true" : ""}`;
  const res = await fetchWithTimeout(url, {
    headers: getAuthHeaders(),
  }, 15000);
  if (!res.ok) throw new Error("Failed to load categories");
  return await res.json();
}

export async function createCategory(data: {
  name: string;
  kind: "expense" | "income";
  icon?: string;
  color_token?: string;
  sort_order?: number;
}): Promise<CategoryItem> {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || "Failed to create category");
  }
  return await res.json();
}

export async function updateCategory(
  id: string,
  data: {
    name?: string;
    icon?: string;
    color_token?: string;
    is_archived?: boolean;
    sort_order?: number;
  }
): Promise<CategoryItem> {
  const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: "PATCH",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || "Failed to update category");
  }
  return await res.json();
}

export async function archiveCategory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || "Failed to archive category");
  }
}

export async function fetchHistoricalAnalytics(params: {
  months?: number;
  endYear?: number;
  endMonth?: number;
} = {}): Promise<HistoricalAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params.months) query.append("months", params.months.toString());
  if (params.endYear) query.append("end_year", params.endYear.toString());
  if (params.endMonth) query.append("end_month", params.endMonth.toString());

  const res = await fetchWithTimeout(`${API_BASE_URL}/transactions/analytics/history?${query.toString()}`, {
    headers: getAuthHeaders(),
  }, 15000);
  if (!res.ok) throw new Error("Failed to load historical analytics");
  return await res.json();
}

export async function fetchTransactions(params: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  kind?: string;
  search?: string;
} = {}): Promise<TransactionItem[]> {
  const query = new URLSearchParams();
  if (params.startDate) query.append("start_date", params.startDate);
  if (params.endDate) query.append("end_date", params.endDate);
  if (params.categoryId) query.append("category_id", params.categoryId);
  if (params.kind) query.append("kind", params.kind);
  if (params.search) query.append("search", params.search);

  const res = await fetch(`${API_BASE_URL}/transactions?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load transactions");
  return await res.json();
}

export async function createTransaction(data: {
  category_id: string;
  kind: "expense" | "income";
  amount_paise: number;
  occurred_on: string;
  description: string;
  merchant?: string;
  note?: string;
  source?: "manual" | "nl";
}): Promise<TransactionItem> {
  const res = await fetch(`${API_BASE_URL}/transactions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create transaction");
  }
  return await res.json();
}

export async function updateTransaction(
  id: string,
  data: Partial<{
    category_id: string;
    kind: "expense" | "income";
    amount_paise: number;
    occurred_on: string;
    description: string;
    merchant?: string;
    note?: string;
  }>
): Promise<TransactionItem> {
  const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update transaction");
  return await res.json();
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete transaction");
}

export async function parseNaturalLanguage(text: string): Promise<NLParseResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/transactions/parse`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  }, 15000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to parse expense");
  }
  return await res.json();
}

export async function bulkCreateTransactions(
  transactions: Array<{
    category_id: string;
    kind: "expense" | "income";
    amount_paise: number;
    occurred_on: string;
    description: string;
    merchant?: string;
    note?: string;
    source: "manual" | "nl";
    nl_original_text?: string;
  }>
): Promise<TransactionItem[]> {
  const res = await fetch(`${API_BASE_URL}/transactions/bulk`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ transactions }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Bulk save failed");
  }
  return await res.json();
}

export async function fetchMonthlySummary(
  year: number,
  month?: number,
  period: "monthly" | "yearly" = "monthly"
): Promise<MonthlySummary> {
  const params = new URLSearchParams({ year: year.toString(), period });
  if (month && period === "monthly") params.append("month", month.toString());
  const res = await fetch(`${API_BASE_URL}/transactions/summary?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load summary");
  return await res.json();
}

export async function fetchBudgetPace(year: number, month: number, asOf?: string): Promise<BudgetPace> {
  const query = new URLSearchParams({ year: year.toString(), month: month.toString() });
  if (asOf) query.append("as_of", asOf);

  const res = await fetch(`${API_BASE_URL}/transactions/pace?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load budget pace");
  return await res.json();
}

export async function fetchMonthlyBudgets(year: number, month: number): Promise<MonthlyBudgetOverview> {
  const res = await fetch(`${API_BASE_URL}/budgets?year=${year}&month=${month}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load budgets");
  return await res.json();
}

export async function setMonthlyBudgets(
  month: string,
  budgets: Array<{ category_id?: string; limit_paise: number }>
): Promise<MonthlyBudgetOverview> {
  const res = await fetch(`${API_BASE_URL}/budgets`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ month, budgets }),
  });
  if (!res.ok) throw new Error("Failed to update budgets");
  return await res.json();
}

export async function fetchAnomalies(): Promise<AnomalyReport> {
  const res = await fetch(`${API_BASE_URL}/transactions/anomalies`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load anomalies");
  return await res.json();
}

// -------------------------------------------------------------
// COPILOT & FINANCIAL INTELLIGENCE APIS (PHASE 3)
// -------------------------------------------------------------

export interface CopilotEvidence {
  period: {
    year: number;
    month: number;
    first_day: string;
    last_day: string;
    total_days: number;
    elapsed_days: number;
    as_of_date: string;
  };
  totals: {
    income_paise: number;
    income_formatted: string;
    expense_paise: number;
    expense_formatted: string;
    net_balance_paise: number;
    net_balance_formatted: string;
    savings_rate_percent: number;
    transaction_count: number;
  };
  previous_month?: {
    year: number;
    month: number;
    income_formatted: string;
    expense_formatted: string;
    net_balance_formatted: string;
  };
  mom_delta?: {
    expense_delta_formatted: string;
    expense_pct_change: number;
    category_shifts: Array<{
      category_name: string;
      diff_formatted: string;
    }>;
  };
  categories: CategoryBreakdownItem[];
  top_category?: CategoryBreakdownItem;
  budget_pace: BudgetPace;
  anomalies: Array<{
    description: string;
    date: string;
    amount_formatted: string;
    evidence: string;
  }>;
  top_expenses: Array<{
    description: string;
    formatted_amount: string;
    category_name: string;
    occurred_on: string;
  }>;
}

export interface NavigationAction {
  label: string;
  target: string;
  section?: string;
}

export interface CopilotQueryResponse {
  query: string;
  answer: string;
  intent: string;
  target_category?: string;
  provider: string;
  tier: number;
  evidence: CopilotEvidence;
  disclaimer: string;
  navigation_action?: NavigationAction;
}

export interface MonthlyReportResponse {
  year: number;
  month: number;
  title: string;
  health_status: string;
  executive_summary: string;
  measured_facts: Record<string, any>;
  category_shifts: string[];
  anomalies: Array<{
    description: string;
    date: string;
    amount: string;
    evidence: string;
  }>;
  recommendations: string[];
  disclaimer: string;
}

export interface AIProviderStatus {
  active_provider: string;
  active_tier: number;
  display_name: string;
  providers: Record<string, any>;
}

export async function askCopilot(
  query: string,
  year: number = 2026,
  month: number = 11
): Promise<CopilotQueryResponse> {
  const res = await fetch(`${API_BASE_URL}/copilot/query`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ query, year, month }),
  });
  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || "Rate limit reached. Please wait a moment before sending another question.");
  }
  if (!res.ok) throw new Error("Failed to get response from Financial Copilot");
  return await res.json();
}

export async function fetchMonthlyReport(
  year: number = 2026,
  month: number = 11
): Promise<MonthlyReportResponse> {
  const res = await fetch(`${API_BASE_URL}/copilot/monthly-report?year=${year}&month=${month}`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 429) {
    throw new Error("Rate limit reached. Please wait a moment before requesting the report.");
  }
  if (!res.ok) throw new Error("Failed to generate monthly intelligence report");
  return await res.json();
}

export async function fetchAIProviderStatus(): Promise<AIProviderStatus> {
  const res = await fetch(`${API_BASE_URL}/copilot/status`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch AI provider status");
  return await res.json();
}

/**
 * Returns the Google OAuth initiation URL.
 * - In production: Uses VITE_AUTH_BASE_URL if configured, or relative API path `${API_BASE_URL}/auth/google/login`.
 * - In local dev: Dynamically resolves to backend port 8000 on the same host to match callback cookie domain.
 */
export function getGoogleOAuthLoginUrl(): string {
  if (AUTH_BASE_URL) {
    const cleanBase = AUTH_BASE_URL.replace(/\/$/, "");
    return `${cleanBase}/api/v1/auth/google/login`;
  }
  if (typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000")) {
    return `${window.location.protocol}//${window.location.hostname}:8000/api/v1/auth/google/login`;
  }
  return `${API_BASE_URL}/auth/google/login`;
}

/**
 * Initiates Google OAuth account linking for the currently authenticated user.
 * Returns { authorization_url: string } and sets the single-use transaction cookie.
 */
export async function linkGoogleAccount(): Promise<{ authorization_url: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/google/link`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to initiate Google account linking.");
    throw new Error(message);
  }
  return await res.json();
}

/**
 * Unlinks the Google OAuth identity from the user's account.
 * Requires that the user has a primary password set to prevent account lockout.
 */
export async function unlinkGoogleAccount(): Promise<UserProfile> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/auth/google/unlink`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to unlink Google account.");
    throw new Error(message);
  }
  return await res.json();
}

// -------------------------------------------------------------
// Income Management & Financial Onboarding Types & API
// -------------------------------------------------------------

export interface IncomeRecord {
  id: string;
  amount_paise: number;
  amount_formatted: string;
  source: string;
  category_id: string;
  category_name: string;
  occurred_on: string;
  description: string;
  is_recurring: boolean;
  created_at: string;
}

export interface IncomeSourceBreakdown {
  source: string;
  total_paise: number;
  total_formatted: string;
  count: number;
  percentage: number;
}

export interface MonthlyIncomeOverview {
  period?: "monthly" | "yearly";
  period_label?: string;
  month: string;
  total_income_paise: number;
  total_income_formatted: string;
  projected_recurring_annual_paise?: number | null;
  projected_recurring_annual_formatted?: string | null;
  items: IncomeRecord[];
  sources_breakdown: IncomeSourceBreakdown[];
}

export interface OnboardingStatus {
  onboarding_completed: boolean;
  monthly_savings_target_paise?: number | null;
  monthly_savings_target_formatted?: string | null;
  has_income_configured: boolean;
  has_budgets_configured: boolean;
  tutorial_completed?: boolean;
}

export interface FinancialPlanSummary {
  monthly_income_paise: number;
  monthly_income_formatted: string;
  allocated_budget_paise: number;
  allocated_budget_formatted: string;
  planned_savings_paise: number;
  planned_savings_formatted: string;
  unallocated_income_paise: number;
  unallocated_income_formatted: string;
  actual_expense_paise: number;
  actual_expense_formatted: string;
  actual_savings_paise: number;
  actual_savings_formatted: string;
  remaining_budget_paise: number;
  remaining_budget_formatted: string;
  savings_rate_pct: number;
  savings_target_paise?: number | null;
  savings_target_formatted?: string | null;
  is_budget_exceeded: boolean;
  is_income_exceeded_by_budget: boolean;
  target_met?: boolean | null;
}

export interface OnboardingSetupPayload {
  month?: string;
  incomes: {
    source: string;
    amount_paise: number;
    category_id?: string;
    occurred_on?: string;
    description?: string;
    is_recurring?: boolean;
  }[];
  budgets: {
    category_id: string;
    limit_paise: number;
  }[];
  monthly_savings_target_paise?: number | null;
}

export async function fetchMonthlyIncome(
  year?: number,
  month?: number,
  period: "monthly" | "yearly" = "monthly"
): Promise<MonthlyIncomeOverview> {
  const params = new URLSearchParams({ period });
  if (year) params.append("year", year.toString());
  if (month && period === "monthly") params.append("month", month.toString());
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/income${qs}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch monthly income overview");
  return await res.json();
}

export async function createIncome(data: {
  amount_paise: number;
  source: string;
  category_id?: string;
  occurred_on: string;
  description?: string;
  is_recurring?: boolean;
}): Promise<IncomeRecord> {
  const res = await fetch(`${API_BASE_URL}/income`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create income record");
  return await res.json();
}

export async function updateIncome(
  id: string,
  data: Partial<{
    amount_paise: number;
    source: string;
    category_id?: string;
    occurred_on?: string;
    description?: string;
    is_recurring?: boolean;
  }>
): Promise<IncomeRecord> {
  const res = await fetch(`${API_BASE_URL}/income/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update income record");
  return await res.json();
}

export async function deleteIncome(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/income/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete income record");
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await fetch(`${API_BASE_URL}/onboarding/status`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch onboarding status");
  return await res.json();
}

export async function submitOnboardingSetup(
  payload: OnboardingSetupPayload
): Promise<FinancialPlanSummary> {
  const res = await fetch(`${API_BASE_URL}/onboarding/setup`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit financial onboarding");
  return await res.json();
}

export async function skipOnboarding(): Promise<{ status: string; message: string; onboarding_completed: boolean }> {
  const res = await fetch(`${API_BASE_URL}/onboarding/skip`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to skip onboarding");
  return await res.json();
}

export async function fetchFinancialPlanSummary(
  year?: number,
  month?: number
): Promise<FinancialPlanSummary> {
  const params = new URLSearchParams();
  if (year) params.append("year", year.toString());
  if (month) params.append("month", month.toString());
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/onboarding/plan-summary${qs}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch financial plan summary");
  return await res.json();
}

export async function fetchTutorialStatus(): Promise<{ tutorial_completed: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/onboarding/tutorial`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch onboarding tutorial status");
  return await res.json();
}

export async function updateTutorialStatus(payload: {
  completed?: boolean;
  skipped?: boolean;
}): Promise<{ tutorial_completed: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/onboarding/tutorial`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update onboarding tutorial status");
  return await res.json();
}

export async function deleteAccount(payload: {
  confirmation_phrase: string;
  password?: string;
}): Promise<{ status: string; message: string }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/account`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const message = await extractErrorMessage(res, "Failed to delete account. Please verify your credentials and confirmation phrase.");
    throw new Error(message);
  }
  return await res.json();
}


// ==============================================================================
// Notification Interfaces & API Calls
// ==============================================================================

export interface NotificationItem {
  id: string;
  category: "account" | "financial" | "tip" | "alert";
  title: string;
  message: string;
  link_path?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  unread_count: number;
  notifications: NotificationItem[];
}

export async function fetchNotifications(): Promise<NotificationListResponse> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return await res.json();
}

export async function markNotificationAsRead(id: string): Promise<NotificationItem> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/${id}/read`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to mark notification as read");
  return await res.json();
}

export async function markAllNotificationsAsRead(): Promise<{ message: string; updated_count: number }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/mark-all-read`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
  return await res.json();
}

export async function deleteNotification(id: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete notification");
}

export interface ReceiptLineItem {
  name: string;
  amount_paise: number;
}

export interface ReceiptExtractResponse {
  file_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  merchant?: string | null;
  amount_paise?: number | null;
  subtotal_paise?: number | null;
  date?: string | null;
  tax_paise?: number | null;
  line_items: ReceiptLineItem[];
  suggested_category_id?: string | null;
  suggested_category_name?: string | null;
  description?: string | null;
  notes?: string | null;
  confidence_score: number;
  extraction_method: string;
  warnings: string[];
}

export async function extractReceipt(file: File): Promise<ReceiptExtractResponse> {
  const token = getStoredToken();
  const csrf = getCsrfToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (csrf) {
    headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetchWithTimeout(`${API_BASE_URL}/receipts/extract`, {
    method: "POST",
    headers,
    body: formData,
  }, 35000);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404) {
      throw new Error("Receipt extraction service is temporarily unavailable. Please verify backend status.");
    }
    if (res.status === 413) {
      throw new Error("Receipt file exceeds the maximum 5 MB size limit.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Authentication session expired. Please sign in again.");
    }
    throw new Error(err.message || err.detail || "Could not parse receipt text. Please review manually.");
  }
  return await res.json();
}


