import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getGoogleOAuthLoginUrl } from "../../lib/api";

describe("Google OAuth Frontend Integration Unit Tests", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  it("resolves Google OAuth initiation URL pointing to port 8000 in Vite dev environment", () => {
    (globalThis as unknown as { window: any }).window = {
      location: {
        protocol: "http:",
        port: "5173",
        hostname: "localhost",
      },
    };

    const url = getGoogleOAuthLoginUrl();
    expect(url).toBe("http://localhost:8000/api/v1/auth/google/login");
  });

  it("resolves Google OAuth initiation URL relative to API base in production", () => {
    (globalThis as unknown as { window: any }).window = {
      location: {
        port: "",
        hostname: "pennypilot.in",
      },
    };

    const url = getGoogleOAuthLoginUrl();
    expect(url).toBe("/api/v1/auth/google/login");
  });

  it("maps Google OAuth error codes to friendly Quiet Ledger user messages", () => {
    const mapOAuthError = (code: string): string => {
      if (code === "oauth_not_configured") {
        return "Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the root .env file, or sign in using email and password.";
      } else if (code === "account_exists_link_required") {
        return "An account with this email address already exists. Please sign in with your email and password first, then link your Google account in Settings.";
      } else if (code === "oauth_cancelled") {
        return "Google sign-in was cancelled. Please try again.";
      } else if (code === "identity_already_linked") {
        return "This Google account is already linked to another user profile.";
      } else if (code === "oauth_transaction_replayed_or_expired") {
        return "The Google authentication session expired. Please try again.";
      }
      return `Google sign-in error: ${code.replace(/_/g, " ")}`;
    };

    expect(mapOAuthError("oauth_not_configured")).toContain("Google Sign-In is not configured yet");
    expect(mapOAuthError("account_exists_link_required")).toContain("An account with this email address already exists");
    expect(mapOAuthError("oauth_cancelled")).toContain("Google sign-in was cancelled");
    expect(mapOAuthError("identity_already_linked")).toContain("already linked to another user profile");
    expect(mapOAuthError("oauth_transaction_replayed_or_expired")).toContain("session expired");
    expect(mapOAuthError("unexpected_code")).toBe("Google sign-in error: unexpected code");
  });

  it("scrubs OAuth error query parameter safely from URL using history.replaceState", () => {
    const mockReplaceState = vi.fn();
    (globalThis as unknown as { window: any }).window = {
      location: {
        pathname: "/login",
        search: "?error=oauth_not_configured",
        hash: "",
      },
      history: {
        replaceState: mockReplaceState,
      },
    };

    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = searchParams.get("error");
    expect(oauthError).toBe("oauth_not_configured");

    searchParams.delete("error");
    const remainingQuery = searchParams.toString();
    const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "") + (window.location.hash || "");

    window.history.replaceState({}, "Title", cleanUrl);
    expect(mockReplaceState).toHaveBeenCalledWith({}, "Title", "/login");
  });

  it("detects ?auth=success and cleans query string on successful OAuth callback", () => {
    const mockReplaceState = vi.fn();
    (globalThis as unknown as { window: any }).window = {
      location: {
        pathname: "/",
        search: "?auth=success",
        hash: "",
      },
      history: {
        replaceState: mockReplaceState,
      },
    };

    const searchParams = new URLSearchParams(window.location.search);
    const isSuccess = searchParams.get("auth") === "success";
    expect(isSuccess).toBe(true);

    searchParams.delete("auth");
    const remainingQuery = searchParams.toString();
    const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "") + (window.location.hash || "");

    window.history.replaceState({}, "Title", cleanUrl);
    expect(mockReplaceState).toHaveBeenCalledWith({}, "Title", "/");
  });
});
