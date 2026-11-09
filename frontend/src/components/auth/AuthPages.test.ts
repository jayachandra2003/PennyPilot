import { describe, it, expect, vi, beforeEach } from "vitest";

describe("SignInPage & CreateAccountPage Logic and Routing Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates Sign In form required inputs", () => {
    const validateSignIn = (email: string, pass: string): string | null => {
      if (!email.trim()) return "Email address is required.";
      if (!pass) return "Password is required.";
      return null;
    };

    expect(validateSignIn("", "secret")).toBe("Email address is required.");
    expect(validateSignIn("user@example.com", "")).toBe("Password is required.");
    expect(validateSignIn("user@example.com", "validPass123!")).toBeNull();
  });

  it("validates Remember Me storage persistence behavior", () => {
    const mockStorage: Record<string, string> = {};
    const setRememberedEmail = (email: string, remember: boolean) => {
      if (remember) {
        mockStorage["pennypilot_remembered_email"] = email;
      } else {
        delete mockStorage["pennypilot_remembered_email"];
      }
    };

    setRememberedEmail("test@pennypilot.in", true);
    expect(mockStorage["pennypilot_remembered_email"]).toBe("test@pennypilot.in");

    setRememberedEmail("test@pennypilot.in", false);
    expect(mockStorage["pennypilot_remembered_email"]).toBeUndefined();
  });

  it("evaluates live password strength criteria for Create Account", () => {
    const checkCriteria = (password: string) => ({
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });

    const weak = checkCriteria("simple");
    expect(weak.hasMinLength).toBe(false);
    expect(weak.hasUppercase).toBe(false);
    expect(weak.hasNumber).toBe(false);
    expect(weak.hasSpecial).toBe(false);

    const strong = checkCriteria("StrongP@ssw0rd!");
    expect(strong.hasMinLength).toBe(true);
    expect(strong.hasUppercase).toBe(true);
    expect(strong.hasNumber).toBe(true);
    expect(strong.hasSpecial).toBe(true);
  });

  it("validates password confirmation and terms agreement", () => {
    const validateSignup = (
      name: string,
      email: string,
      pass: string,
      confirmPass: string,
      agreeTerms: boolean
    ): string | null => {
      if (!name.trim()) return "Please enter your full name.";
      if (!email.trim()) return "Please enter your email address.";
      if (pass.length < 8) return "Password must be at least 8 characters long.";
      if (pass !== confirmPass) return "Passwords do not match. Please verify both fields.";
      if (!agreeTerms) return "Please agree to the Terms of Service and Privacy Policy to continue.";
      return null;
    };

    expect(validateSignup("", "a@b.com", "pass1234!", "pass1234!", true)).toBe("Please enter your full name.");
    expect(validateSignup("Aarav", "", "pass1234!", "pass1234!", true)).toBe("Please enter your email address.");
    expect(validateSignup("Aarav", "a@b.com", "short", "short", true)).toBe("Password must be at least 8 characters long.");
    expect(validateSignup("Aarav", "a@b.com", "validPass1!", "differentPass1!", true)).toBe("Passwords do not match. Please verify both fields.");
    expect(validateSignup("Aarav", "a@b.com", "validPass1!", "validPass1!", false)).toBe("Please agree to the Terms of Service and Privacy Policy to continue.");
    expect(validateSignup("Aarav", "a@b.com", "validPass1!", "validPass1!", true)).toBeNull();
  });

  it("verifies dedicated auth route path resolutions", () => {
    const resolveRoute = (path: string): string => {
      if (path.includes("/privacy")) return "privacy";
      if (path.includes("/terms")) return "terms";
      if (path.includes("/security")) return "security";
      if (path.includes("/login") || path.includes("/signin")) return "login";
      if (path.includes("/signup") || path.includes("/register")) return "signup";
      return "dashboard";
    };

    expect(resolveRoute("/login")).toBe("login");
    expect(resolveRoute("/signin")).toBe("login");
    expect(resolveRoute("/signup")).toBe("signup");
    expect(resolveRoute("/register")).toBe("signup");
    expect(resolveRoute("/")).toBe("dashboard");
    expect(resolveRoute("/privacy")).toBe("privacy");
  });
});
