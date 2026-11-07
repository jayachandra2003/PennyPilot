import React, { useEffect, useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { PennyPilotLogo } from "../common/PennyPilotLogo";
import { resetPassword } from "../../lib/api";
import { useToast } from "../common/Toast";

interface ResetPasswordModalProps {
  token?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onOpenForgotPassword?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  token: propToken,
  isOpen,
  onClose,
  onOpenLogin,
  onOpenForgotPassword,
}) => {
  const [capturedToken, setCapturedToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"form" | "success" | "expired" | "invalid">("form");

  const { toast } = useToast();

  // Safely extract and capture the token from URL, then purge from browser history
  useEffect(() => {
    if (!isOpen) return;

    let tokenToUse = propToken;
    if (!tokenToUse && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      tokenToUse = searchParams.get("token");
    }

    if (tokenToUse && tokenToUse.trim()) {
      setCapturedToken(tokenToUse.trim());
      setState("form");
      setError(null);

      // Scrub token from browser address bar and history to prevent leak via referrer/history
      if (typeof window !== "undefined" && window.history?.replaceState) {
        const cleanPath = window.location.pathname === "/reset-password" ? "/" : window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);
      }
    } else if (!capturedToken) {
      setState("invalid");
      setError("No password reset token was provided. Please request a new password reset link.");
    }
  }, [isOpen, propToken]);

  if (!isOpen) return null;

  const resetForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!capturedToken) {
      setState("invalid");
      setError("Missing or invalid reset token. Please request a new link.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(capturedToken, newPassword);
      setState("success");
      toast(res.message || "Password reset successfully! Please sign in.", "success");
      resetForm();
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("expired") || msg.includes("TOKEN_EXPIRED")) {
        setState("expired");
        setError("This password reset link has expired (links are valid for 15 minutes).");
      } else if (
        msg.toLowerCase().includes("already used") ||
        msg.toLowerCase().includes("invalid") ||
        msg.includes("TOKEN_ALREADY_USED") ||
        msg.includes("INVALID_TOKEN")
      ) {
        setState("invalid");
        setError("This password reset link is invalid or has already been used.");
      } else {
        setError(msg || "Failed to reset password. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-title"
    >
      <div className="bg-ledger-surface max-w-md w-full rounded-2xl border border-ledger-border shadow-float overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ledger-border bg-ledger-surfaceSubtle">
          <div className="flex items-center gap-3">
            <PennyPilotLogo variant="symbol" size="md" />
            <div>
              <h2 id="reset-password-title" className="font-sans font-bold text-base text-ledger-ink">
                Reset Password
              </h2>
              <p className="text-xs text-ledger-inkMuted">Choose a new password for your account</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-ledger-inkSubtle hover:text-ledger-ink p-1.5 rounded-lg focus-ring"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success State */}
        {state === "success" && (
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-sans font-bold text-lg text-ledger-ink">Password Updated</h3>
              <p className="text-xs text-ledger-inkMuted max-w-xs mx-auto leading-relaxed">
                Your password has been reset successfully. All previous sessions have been signed out for security.
                You can now sign in with your new password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="btn-primary w-full py-2.5 justify-center font-medium text-xs sm:text-sm mt-4 inline-flex items-center gap-1.5"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Expired Token State */}
        {state === "expired" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <Clock className="w-5 h-5 shrink-0 text-amber-600" />
              <div className="text-xs">
                <p className="font-semibold">Reset Link Expired</p>
                <p className="text-amber-700 mt-0.5">
                  Password reset links are valid for 15 minutes for your security.
                </p>
              </div>
            </div>
            <p className="text-xs text-ledger-inkMuted leading-relaxed">
              Please request a fresh reset link to create a new password.
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenForgotPassword) {
                    onOpenForgotPassword();
                  } else {
                    onOpenLogin();
                  }
                }}
                className="btn-primary w-full py-2.5 justify-center font-medium text-xs sm:text-sm"
              >
                Request New Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="btn-ghost w-full py-2 justify-center text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Invalid Token State */}
        {state === "invalid" && (
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-sans font-bold text-lg text-ledger-ink">Invalid Reset Link</h3>
              <p className="text-xs text-ledger-inkMuted max-w-xs mx-auto leading-relaxed">
                {error || "This reset link is invalid or has already been consumed. Each reset link can only be used once."}
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenForgotPassword) {
                    onOpenForgotPassword();
                  } else {
                    onOpenLogin();
                  }
                }}
                className="btn-primary w-full py-2.5 justify-center font-medium text-xs sm:text-sm"
              >
                Request New Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="btn-ghost w-full py-2 justify-center text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* Normal Form State */}
        {state === "form" && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs animate-shake"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed block">{error}</span>
              </div>
            )}

            <p className="text-xs text-ledger-inkMuted">
              Enter your new account password below. Choose a strong password of at least 8 characters.
            </p>

            {/* New Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider"
                >
                  New Password
                </label>
                <span className="text-[11px] text-ledger-inkMuted font-mono">Min 8 chars</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-ledger-inkMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reset-new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="input-base pl-9 pr-9 text-xs sm:text-sm"
                  autoComplete="new-password"
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

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-confirm-password"
                className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ledger-inkMuted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="input-base pl-9 pr-9 text-xs sm:text-sm"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ledger-inkMuted hover:text-ledger-ink focus-ring rounded"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-2.5 justify-center font-medium text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Updating Password...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span>Set New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="btn-ghost w-full py-2 justify-center text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
