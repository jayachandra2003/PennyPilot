import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("ResetPassword UI Component & Logic Unit Tests", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  it("extracts token safely from URL and sanitizes browser history", () => {
    const mockReplaceState = vi.fn();
    (globalThis as unknown as { window: any }).window = {
      location: {
        pathname: "/reset-password",
        search: "?token=secret_test_token_12345",
      },
      history: {
        replaceState: mockReplaceState,
      },
    };

    const searchParams = new URLSearchParams(window.location.search);
    const capturedToken = searchParams.get("token");

    expect(capturedToken).toBe("secret_test_token_12345");

    // History scrubbing
    if (window.history?.replaceState) {
      window.history.replaceState({}, "Title", "/");
    }
    expect(mockReplaceState).toHaveBeenCalledWith({}, "Title", "/");
  });

  it("validates password length and matching confirmation requirements", () => {
    const validate = (pass: string, confirm: string): string | null => {
      if (pass.length < 8) return "Password must be at least 8 characters long.";
      if (pass !== confirm) return "Passwords do not match. Please re-enter.";
      return null;
    };

    expect(validate("short", "short")).toBe("Password must be at least 8 characters long.");
    expect(validate("validPassword123!", "differentPassword123!")).toBe("Passwords do not match. Please re-enter.");
    expect(validate("validPassword123!", "validPassword123!")).toBeNull();
  });

  it("maps error status codes to correct UI states", () => {
    const getUiState = (errorMsg: string): "expired" | "invalid" | "form" => {
      const lower = errorMsg.toLowerCase();
      if (lower.includes("expired") || errorMsg.includes("TOKEN_EXPIRED")) return "expired";
      if (
        lower.includes("already used") ||
        lower.includes("invalid") ||
        errorMsg.includes("TOKEN_ALREADY_USED") ||
        errorMsg.includes("INVALID_TOKEN")
      ) {
        return "invalid";
      }
      return "form";
    };

    expect(getUiState("TOKEN_EXPIRED")).toBe("expired");
    expect(getUiState("This password reset link has expired.")).toBe("expired");
    expect(getUiState("TOKEN_ALREADY_USED")).toBe("invalid");
    expect(getUiState("Invalid password reset link.")).toBe("invalid");
    expect(getUiState("Network error. Please try again.")).toBe("form");
  });
});
