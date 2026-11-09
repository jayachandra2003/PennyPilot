import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { PennyPilotLogo } from "../common/PennyPilotLogo";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../common/Toast";
import { forgotPassword, getGoogleOAuthLoginUrl, maskEmail, resendVerification } from "../../lib/api";
import { AuthShowcaseIllustration } from "./AuthShowcaseIllustration";

interface SignInPageProps {
  onNavigateToSignup: () => void;
  onNavigateToHome: () => void;
  onOpenLegal?: (doc: "privacy" | "terms" | "security") => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onNavigateToSignup,
  onNavigateToHome,
  onOpenLegal,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password & resend states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [unverifiedEmailDetected, setUnverifiedEmailDetected] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();

  // Load remembered email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("pennypilot_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle Google OAuth callback error parameters
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = searchParams.get("error");
    if (oauthError) {
      if (oauthError === "oauth_not_configured") {
        setError(
          "Google Sign-In is not configured yet. Please configure credentials in the environment or sign in with your email and password."
        );
      } else if (oauthError === "account_exists_link_required") {
        setError(
          "An account with this email address already exists. Please sign in with your password first, then link Google in Settings."
        );
      } else if (oauthError === "oauth_cancelled") {
        setError("Google sign-in was cancelled. Please try again.");
      } else if (oauthError === "identity_already_linked") {
        setError("This Google account is already linked to another user profile.");
      } else {
        setError(`Google sign-in error: ${oauthError.replace(/_/g, " ")}`);
      }

      if (window.history?.replaceState) {
        searchParams.delete("error");
        const remainingQuery = searchParams.toString();
        const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "");
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  const handleGoogleSignIn = () => {
    setError(null);
    window.location.href = getGoogleOAuthLoginUrl();
  };

  const handleResendVerification = async () => {
    if (isResending || resendCooldown > 0) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast("Please enter your email address.", "error");
      return;
    }
    setIsResending(true);
    try {
      const res = await resendVerification(cleanEmail);
      toast(res.message || "Verification email sent. Please check your inbox.", "success");
      setResendCooldown(60);
    } catch (err: any) {
      toast(err.message || "Failed to resend verification link.", "error");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setUnverifiedEmailDetected(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email address is required.");
      return;
    }

    // Forgot Password Submit
    if (isForgotMode) {
      setIsSubmitting(true);
      try {
        await forgotPassword(trimmedEmail);
        setResetSent(true);
      } catch {
        setResetSent(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Normal Login Submit
    if (!password) {
      setError("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Remember me handling
      try {
        if (rememberMe) {
          localStorage.setItem("pennypilot_remembered_email", trimmedEmail);
        } else {
          localStorage.removeItem("pennypilot_remembered_email");
        }
      } catch {
        // Storage safe
      }

      await login(trimmedEmail, password);
      toast("Signed in successfully.", "success");
      onNavigateToHome();
    } catch (err: any) {
      const msg = err.message || "Invalid email or password.";
      setError(msg);
      if (msg.toLowerCase().includes("verify your email") || msg.toLowerCase().includes("email_not_verified")) {
        setUnverifiedEmailDetected(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF8] via-[#FAF9F5] to-[#E6F4F1] text-slate-900 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-900 flex flex-col justify-between relative overflow-x-hidden">
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-b from-emerald-100/50 via-teal-50/40 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Bar Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onNavigateToHome}
          className="flex items-center gap-2.5 focus-ring rounded-xl group select-none cursor-pointer"
          aria-label="Back to PennyPilot home"
        >
          <PennyPilotLogo variant="symbol" size="md" />
          <span className="font-bold text-xl sm:text-2xl tracking-tight text-slate-900">
            PennyPilot
          </span>
        </button>

        <button
          type="button"
          onClick={onNavigateToHome}
          className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-800 transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Two-Column Layout */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Branded Showcase (Desktop) */}
          <div className="hidden lg:block lg:col-span-6 space-y-6 text-left">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Manage Your Finances Smarter with{" "}
                <span className="text-[#0A5C4D]">PennyPilot</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed">
                Track expenses, scan receipts, get AI insights and make better money decisions with one unified platform.
              </p>
            </div>

            {/* Showcase Illustration */}
            <AuthShowcaseIllustration />

            {/* Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm font-medium text-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Track Income & Expenses</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Receipt Scanning (OCR)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>AI Financial Copilot</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Budgets & Insights</span>
              </div>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>Monthly Reports (PDF & CSV)</span>
              </div>
            </div>

            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Your data is secure and private</span>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-7 sm:p-9 border border-slate-200/90 shadow-[0_20px_50px_rgba(15,118,110,0.08)] space-y-6">
              {/* Card Header */}
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {isForgotMode ? "Reset Your Password" : "Sign In to PennyPilot"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {isForgotMode
                    ? "Enter your email to receive a password reset link."
                    : "Welcome back! Continue your financial journey."}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{error}</p>
                    {unverifiedEmailDetected && (
                      <button
                        type="button"
                        disabled={isResending || resendCooldown > 0}
                        onClick={handleResendVerification}
                        className="font-bold underline text-rose-900 hover:text-rose-950 inline-block cursor-pointer"
                      >
                        {resendCooldown > 0
                          ? `Resend link in ${resendCooldown}s`
                          : "Resend Verification Link →"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mode: Forgot Password Confirmation Screen */}
              {isForgotMode && resetSent ? (
                <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#0A5C4D] flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">Check Your Inbox</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      If an account exists for <span className="font-mono font-medium text-slate-800">{maskEmail(email)}</span>, we sent a password reset link valid for 15 minutes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setResetSent(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#0A5C4D] hover:bg-[#07473B] text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                /* Main Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="signin-email"
                      className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#0A5C4D] focus:ring-2 focus:ring-[#0A5C4D]/20 text-xs sm:text-sm text-slate-900 transition-all outline-none"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input (Hidden in Forgot Mode) */}
                  {!isForgotMode && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="signin-password"
                          className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotMode(true);
                            setError(null);
                          }}
                          className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#0A5C4D] focus:ring-2 focus:ring-[#0A5C4D]/20 text-xs sm:text-sm text-slate-900 transition-all outline-none"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remember Me Checkbox */}
                  {!isForgotMode && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="signin-remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-[#0A5C4D] rounded border-slate-300 focus:ring-[#0A5C4D] cursor-pointer"
                      />
                      <label
                        htmlFor="signin-remember"
                        className="text-xs text-slate-600 font-medium select-none cursor-pointer"
                      >
                        Remember me
                      </label>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 text-sm font-semibold text-white bg-[#0A5C4D] hover:bg-[#07473B] active:scale-[0.99] rounded-xl shadow-[0_4px_14px_rgba(10,92,77,0.25)] hover:shadow-[0_6px_20px_rgba(10,92,77,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none mt-2"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>{isForgotMode ? "Sending Link..." : "Signing In..."}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span>{isForgotMode ? "Send Reset Link" : "Sign In"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>

                  {/* Return to Sign In button if in Forgot Mode */}
                  {isForgotMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(false);
                        setError(null);
                      }}
                      className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  )}

                  {/* Divider */}
                  {!isForgotMode && (
                    <>
                      <div className="relative my-4" aria-hidden="true">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-2.5 text-slate-400 font-medium text-[11px]">
                            or continue with
                          </span>
                        </div>
                      </div>

                      {/* Google OAuth Button */}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold transition-all shadow-2xs flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </>
                  )}
                </form>
              )}

              {/* Card Footer: Navigate to Signup */}
              <div className="pt-2 text-center text-xs sm:text-sm text-slate-600">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={onNavigateToSignup}
                  className="font-bold text-[#0A5C4D] hover:text-[#07473B] underline underline-offset-2 cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 text-center sm:text-left">
        <div>
          <span>PennyPilot © 2026 • </span>
          <span>Built by <strong className="text-slate-700">Jaya Chandra Vennam</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal("privacy")}
            className="hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal("terms")}
            className="hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal("security")}
            className="hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Security Standards
          </button>
        </div>
      </footer>
    </div>
  );
};
