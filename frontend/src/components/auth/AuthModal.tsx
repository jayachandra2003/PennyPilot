import React, { useEffect, useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { PennyPilotLogo } from "../common/PennyPilotLogo";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../common/Toast";
import { forgotPassword, getGoogleOAuthLoginUrl, maskEmail, resendVerification } from "../../lib/api";

type AuthMode = "login" | "register" | "verification_pending" | "forgot_password";

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isForced?: boolean;
  initialMode?: "login" | "register";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isForced = false,
  initialMode = "login",
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email verification & password reset states
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [unverifiedEmailDetected, setUnverifiedEmailDetected] = useState(false);
  const [emailDispatched, setEmailDispatched] = useState(true);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);

  const { login, register } = useAuth();
  const { toast } = useToast();

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Detect Google OAuth callback redirect error parameters
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = searchParams.get("error");
    if (oauthError) {
      if (oauthError === "oauth_not_configured") {
        setError(
          "Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the root .env file, or sign in using email and password."
        );
      } else if (oauthError === "account_exists_link_required") {
        setError(
          "An account with this email address already exists. Please sign in with your email and password first, then link your Google account in Settings."
        );
      } else if (oauthError === "oauth_cancelled") {
        setError("Google sign-in was cancelled. Please try again.");
      } else if (oauthError === "identity_already_linked") {
        setError("This Google account is already linked to another user profile.");
      } else if (oauthError === "oauth_transaction_replayed_or_expired") {
        setError("The Google authentication session expired. Please try again.");
      } else if (oauthError === "id_token_expired") {
        setError("Your Google authentication token has expired. Please sign in again.");
      } else if (oauthError === "unverified_email_rejected") {
        setError("Your Google account email has not been verified by Google. Please verify it first.");
      } else if (oauthError === "id_token_signature_invalid") {
        setError("Google authentication failed: token signature could not be verified.");
      } else {
        setError(`Google sign-in error: ${oauthError.replace(/_/g, " ")}`);
      }

      // Clean the error parameter from URL so it doesn't persist across manual reloads
      if (window.history?.replaceState) {
        searchParams.delete("error");
        const remainingQuery = searchParams.toString();
        const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "") + (window.location.hash || "");
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [isOpen]);

  const handleGoogleSignIn = () => {
    setError(null);
    window.location.href = getGoogleOAuthLoginUrl();
  };

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError(null);
    setShowPassword(false);
    setResetSent(false);
    setUnverifiedEmailDetected(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setResetSent(false);
    setUnverifiedEmailDetected(false);
  };

  const handleResendClick = async (targetEmail: string) => {
    if (isResending || resendCooldown > 0) return;
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) {
      toast("Please enter your email address first.", "error");
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

    // Mode: Forgot Password
    if (mode === "forgot_password") {
      setIsSubmitting(true);
      try {
        await forgotPassword(trimmedEmail);
        setResetSent(true);
      } catch (err: any) {
        // Safe: don't reveal internal errors
        setResetSent(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    // Mode: Register
    if (mode === "register") {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        setError("Full name is required.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await register(trimmedEmail, password, trimmedName);
        setRegisteredEmail(trimmedEmail);
        setEmailDispatched(res.email_dispatched !== false);
        setDispatchNotice(res.message || null);
        if (res.email_verification_required) {
          setMode("verification_pending");
          setResendCooldown(60);
          if (res.email_dispatched === false && res.message) {
            toast(res.message, "error");
          }
        } else {
          toast("Account created successfully! Welcome to PennyPilot.", "success");
          resetForm();
          if (onClose) onClose();
        }
      } catch (err: any) {
        setError(err.message || "Failed to create account. Please check details.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Mode: Login
      setIsSubmitting(true);
      try {
        await login(trimmedEmail, password);
        toast("Signed in successfully.", "success");
        resetForm();
        if (onClose) onClose();
      } catch (err: any) {
        const msg = err.message || "Invalid email or password.";
        setError(msg);
        if (msg.toLowerCase().includes("verify your email") || msg.toLowerCase().includes("email_not_verified")) {
          setUnverifiedEmailDetected(true);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white dark:bg-[#121C28] backdrop-blur-2xl max-w-md w-full rounded-3xl border border-ledger-border shadow-float overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ledger-border bg-ledger-surfaceSubtle">
          <div className="flex items-center gap-3">
            <PennyPilotLogo variant="symbol" size="md" />
            <div>
              <h2 id="auth-modal-title" className="font-sans font-bold text-base text-ledger-ink">
                {mode === "login" && "Sign in to PennyPilot"}
                {mode === "register" && "Create your Account"}
                {mode === "verification_pending" && "Verify Your Email"}
                {mode === "forgot_password" && "Reset Password"}
              </h2>
              <p className="text-xs text-ledger-inkMuted">
                {mode === "login" && "Access your personal financial ledger"}
                {mode === "register" && "Private, intelligent financial tracking"}
                {mode === "verification_pending" && "Check your inbox to activate your account"}
                {mode === "forgot_password" && "We'll send you instructions to reset your password"}
              </p>
            </div>
          </div>

          {!isForced && onClose && (
            <button
              onClick={onClose}
              className="text-ledger-inkSubtle hover:text-ledger-ink p-1.5 rounded-lg focus-ring"
              aria-label="Close authentication modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Account Switcher (Sign In / Create Account) */}
        {(mode === "login" || mode === "register") && (
          <div className="px-5 pt-4">
            <div className="grid grid-cols-2 p-1 rounded-lg bg-ledger-bg border border-ledger-border text-xs font-medium">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`py-1.5 rounded-md transition-all ${
                  mode === "login"
                    ? "bg-ledger-surface text-ledger-ink font-semibold shadow-hairline"
                    : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`py-1.5 rounded-md transition-all ${
                  mode === "register"
                    ? "bg-ledger-surface text-ledger-ink font-semibold shadow-hairline"
                    : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* Verification Pending Screen */}
        {mode === "verification_pending" && (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 text-ledger-teal flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-semibold text-ledger-ink text-sm">
                {emailDispatched ? "Verification Link Sent" : "Account Created — Email Pending"}
              </h3>
              <p className="text-xs text-ledger-inkMuted leading-relaxed max-w-sm mx-auto">
                {emailDispatched ? (
                  <>
                    We've sent a single-use verification link to{" "}
                    <span className="font-mono font-medium text-ledger-ink">
                      {maskEmail(registeredEmail || email)}
                    </span>
                    . Please click the link to activate your account.
                  </>
                ) : (
                  <>
                    {dispatchNotice || "Verification email delivery could not be completed immediately. Please use the resend button below to dispatch a new link."}
                  </>
                )}
              </p>
            </div>

            <div className="p-3 bg-ledger-bg border border-ledger-border rounded-lg text-xs text-ledger-inkMuted text-left space-y-1">
              <p className="font-medium text-ledger-ink">Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Check your spam or junk folder</li>
                <li>Verification links remain valid for 30 minutes</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isResending || resendCooldown > 0}
                onClick={() => handleResendClick(registeredEmail || email)}
                className="btn-secondary w-full py-2 justify-center text-xs"
              >
                {isResending ? (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sending Link...
                  </span>
                ) : resendCooldown > 0 ? (
                  <span>Resend available in {resendCooldown}s</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Verification Email
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchMode("login")}
                className="btn-primary w-full py-2 justify-center text-xs"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Forgot Password Screen */}
        {mode === "forgot_password" && (
          <div className="p-5 space-y-4">
            {resetSent ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-ledger-ink text-sm">Check Your Inbox</h3>
                  <p className="text-xs text-ledger-inkMuted leading-relaxed">
                    If an account exists for{" "}
                    <span className="font-mono font-medium text-ledger-ink">{maskEmail(email)}</span>,
                    we've dispatched password reset instructions. The reset link is valid for 15 minutes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="btn-primary w-full py-2 justify-center text-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs text-ledger-inkMuted">
                  Enter your account email below. We'll send you a secure link to create a new password.
                </p>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-ledger-inkMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="aarav@pennypilot.in"
                      className="input-base pl-9 text-xs sm:text-sm"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full py-2.5 justify-center text-xs sm:text-sm"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending Reset Link...
                      </span>
                    ) : (
                      "Send Password Reset Link"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="btn-ghost w-full py-2 justify-center text-xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Login & Register Forms */}
        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs animate-shake"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <span className="leading-relaxed block">{error}</span>
                  {mode === "register" && error.toLowerCase().includes("already exists") && (
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-semibold underline hover:text-red-900 inline-block text-xs mt-0.5"
                    >
                      Switch to Sign In →
                    </button>
                  )}
                  {(error.toLowerCase().includes("google sign-in") || error.toLowerCase().includes("continue with google")) && (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="font-semibold underline hover:text-red-900 inline-block text-xs mt-1"
                    >
                      Continue with Google →
                    </button>
                  )}
                  {unverifiedEmailDetected && (
                    <button
                      type="button"
                      disabled={isResending || resendCooldown > 0}
                      onClick={() => handleResendClick(email)}
                      className="font-semibold underline hover:text-red-900 inline-block text-xs mt-1"
                    >
                      {resendCooldown > 0
                        ? `Resend link available in ${resendCooldown}s`
                        : "Resend Verification Link →"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === "register" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-displayName"
                  className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider"
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-ledger-inkMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="input-base pl-9 text-xs sm:text-sm"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ledger-inkMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aarav@pennypilot.in"
                  className="input-base pl-9 text-xs sm:text-sm"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider"
                >
                  Password
                </label>
                {mode === "register" ? (
                  <span className="text-[11px] text-ledger-inkMuted font-mono">Min 8 chars</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot_password")}
                    className="text-[11px] text-ledger-teal hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-ledger-inkMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                  className="input-base pl-9 pr-9 text-xs sm:text-sm"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ledger-inkMuted hover:text-ledger-ink focus-ring rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 mt-2 justify-center font-medium text-xs sm:text-sm"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing In..." : "Creating Account..."}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>

            {/* Subtle Divider */}
            <div className="relative my-3" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ledger-borderSubtle" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-ledger-surface px-2 text-ledger-inkSubtle uppercase tracking-wider font-semibold text-[10px]">
                  or
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-ledger-border bg-ledger-surface hover:bg-ledger-surfaceSubtle active:bg-ledger-bg text-ledger-ink text-xs sm:text-sm font-medium transition-all shadow-hairline flex items-center justify-center gap-2.5 focus-ring disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Continue with Google"
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
          </form>
        )}
      </div>
    </div>
  );
};
