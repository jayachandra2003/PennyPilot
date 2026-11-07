import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Clock, ArrowRight, Mail, RefreshCw, X } from "lucide-react";
import { verifyEmail, resendVerification } from "../../lib/api";
import { useToast } from "../common/Toast";

interface EmailVerificationModalProps {
  token?: string | null;
  statusParam?: "success" | "expired" | "invalid" | null;
  emailParam?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  token,
  statusParam,
  emailParam,
  isOpen,
  onClose,
  onOpenLogin,
}) => {
  const [state, setState] = useState<"verifying" | "success" | "expired" | "invalid">("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendEmail, setResendEmail] = useState<string>(emailParam || "");
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    if (statusParam === "success") {
      setState("success");
      return;
    }
    if (statusParam === "expired") {
      setState("expired");
      setErrorMessage("This verification link has expired (links are valid for 30 minutes).");
      return;
    }
    if (statusParam === "invalid") {
      setState("invalid");
      setErrorMessage("This verification link is invalid or has already been consumed.");
      return;
    }

    if (token) {
      setState("verifying");
      verifyEmail(token)
        .then(() => {
          setState("success");
          toast("Email verified successfully! Welcome to PennyPilot.", "success");
        })
        .catch((err: any) => {
          const msg = err.message || "";
          if (msg.toLowerCase().includes("expired")) {
            setState("expired");
            setErrorMessage(msg);
          } else {
            setState("invalid");
            setErrorMessage(msg || "The verification link is invalid or has already been used.");
          }
        });
    } else {
      setState("invalid");
      setErrorMessage("No verification token was provided.");
    }
  }, [token, statusParam, isOpen, toast]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resendEmail.trim();
    if (!targetEmail || isResending || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const res = await resendVerification(targetEmail);
      toast(res.message || "A new verification link has been sent.", "success");
      setResendCooldown(60);
    } catch (err: any) {
      toast(err.message || "Failed to resend verification link.", "error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-title"
    >
      <div className="bg-ledger-surface max-w-md w-full rounded-2xl border border-ledger-border shadow-float overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ledger-border bg-ledger-surfaceSubtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-ledger-teal text-white flex items-center justify-center shadow-sm">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 id="verification-title" className="font-sans font-bold text-base text-ledger-ink">
                Email Verification
              </h2>
              <p className="text-xs text-ledger-inkMuted">PennyPilot Identity Authentication</p>
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

        {/* Content Body */}
        <div className="p-6 text-center space-y-5">
          {state === "verifying" && (
            <div className="py-8 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full border-3 border-ledger-teal/20 border-t-ledger-teal animate-spin" />
              <div className="space-y-1">
                <h3 className="font-sans font-bold text-base text-ledger-ink">Verifying Email...</h3>
                <p className="text-xs text-ledger-inkMuted">
                  Confirming your single-use cryptographic token.
                </p>
              </div>
            </div>
          )}

          {state === "success" && (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-sans font-bold text-lg text-ledger-ink">Account Verified!</h3>
                <p className="text-xs text-ledger-inkMuted max-w-xs mx-auto leading-relaxed">
                  Your email address has been verified successfully. You can now access your full personal financial ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="btn-primary w-full py-2.5 justify-center font-medium text-xs sm:text-sm mt-4"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          )}

          {state === "expired" && (
            <div className="py-4 space-y-4 text-left">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <Clock className="w-5 h-5 shrink-0 text-amber-600" />
                <div className="text-xs">
                  <p className="font-semibold">Verification Link Expired</p>
                  <p className="text-amber-700 mt-0.5">{errorMessage || "Links expire after 30 minutes for security."}</p>
                </div>
              </div>
              <p className="text-xs text-ledger-inkMuted leading-relaxed">
                Enter your email address below to receive a fresh verification link:
              </p>
              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="aarav@pennypilot.in"
                  className="input-base text-xs sm:text-sm w-full"
                  required
                />
                <button
                  type="submit"
                  disabled={isResending || resendCooldown > 0}
                  className="btn-primary w-full py-2.5 justify-center font-medium text-xs sm:text-sm"
                >
                  {isResending ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Sending Link...
                    </span>
                  ) : resendCooldown > 0 ? (
                    <span>Resend available in {resendCooldown}s</span>
                  ) : (
                    <span>Send Fresh Verification Link</span>
                  )}
                </button>
              </form>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
                className="text-xs text-ledger-inkMuted hover:text-ledger-ink font-medium w-full text-center block pt-2"
              >
                &larr; Back to Sign In
              </button>
            </div>
          )}

          {state === "invalid" && (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-sans font-bold text-lg text-ledger-ink">Invalid Verification Link</h3>
                <p className="text-xs text-ledger-inkMuted max-w-xs mx-auto leading-relaxed">
                  {errorMessage || "This verification link is invalid or has already been consumed. If your email is already verified, you can sign in directly."}
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogin();
                  }}
                  className="btn-primary w-full py-2.5 justify-center font-medium text-xs sm:text-sm"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setState("expired")}
                  className="text-xs text-ledger-inkMuted hover:text-ledger-ink font-medium w-full text-center block py-1"
                >
                  Need a new verification link?
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
