import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Lock, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { deleteAccount } from "../../lib/api";
import { useToast } from "../common/Toast";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const requiredPhrase = "DELETE MY ACCOUNT";
  const isPhraseMatch = confirmationPhrase === requiredPhrase;
  const isPasswordRequired = Boolean(user?.has_password);
  const isFormValid = isPhraseMatch && (!isPasswordRequired || password.length > 0);

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationPhrase("");
    setPassword("");
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteAccount({
        confirmation_phrase: confirmationPhrase,
        password: isPasswordRequired ? password : undefined,
      });

      toast("Your account and all financial data have been permanently deleted.", "success");
      handleClose();
      // Ensure clean logout and redirection
      await logout();
      if (typeof window !== "undefined") {
        window.location.href = "/?deleted=true";
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete account. Please verify your credentials.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white dark:bg-[#121C28] rounded-2xl border border-rose-300 dark:border-rose-900/80 shadow-[0_20px_50px_rgba(0,0,0,0.3)] max-w-lg w-full p-5 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-rose-100 dark:border-rose-950/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="delete-account-title"
                className="font-serif text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F3EF] tracking-tight"
              >
                Delete Account Permanently
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                Irreversible destructive operation
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors focus-ring cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Consequences Warning Callout */}
        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-2 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 font-sans uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Immediate & Permanent Consequences</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
            <li>Your account will be immediately closed and cannot be restored.</li>
            <li>All verified transactions, category budgets, financial plans, and historical trend data will be permanently erased.</li>
            <li>All active sessions and linked Google OAuth connections will be revoked.</li>
            <li>Your profile details and uploaded avatar images will be physically destroyed.</li>
          </ul>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-4">
          {/* Confirmation Phrase Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirmation-phrase-input"
              className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              To confirm, type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">DELETE MY ACCOUNT</span> below:
            </label>
            <input
              id="confirmation-phrase-input"
              type="text"
              autoComplete="off"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="input-base font-mono text-xs sm:text-sm tracking-wide border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500"
              disabled={isDeleting}
            />
          </div>

          {/* Password Re-verification Input (if password set) */}
          {isPasswordRequired ? (
            <div className="space-y-1.5">
              <label
                htmlFor="delete-account-password"
                className="block text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between"
              >
                <span>Confirm your password</span>
                <span className="text-[10px] text-slate-500 font-normal">Identity verification</span>
              </label>
              <div className="relative">
                <input
                  id="delete-account-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="input-base text-xs sm:text-sm pl-9"
                  disabled={isDeleting}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              You are signed in via Google OAuth. Deleting your account will immediately revoke all active sessions.
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="btn-secondary w-full sm:w-auto text-xs px-4 py-2 cursor-pointer focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isDeleting}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[38px] rounded-xl text-xs sm:text-sm font-semibold transition-all select-none w-full sm:w-auto ${
                isFormValid && !isDeleting
                  ? "bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-sm cursor-pointer"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {isDeleting ? "Deleting Account..." : "I understand, delete my account"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
