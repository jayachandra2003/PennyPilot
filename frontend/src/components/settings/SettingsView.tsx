import React, { useState, useRef, useEffect } from "react";
import {
  User as UserIcon,
  Sun,
  Moon,
  Coins,
  Shield,
  KeyRound,
  LogOut,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Compass,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  updateUserProfile,
  uploadAvatar,
  deleteAvatar,
  getAvatarImageUrl,
  forgotPassword,
  updateTutorialStatus,
  linkGoogleAccount,
  unlinkGoogleAccount,
} from "../../lib/api";
import { useToast } from "../common/Toast";
import { DeleteAccountModal } from "./DeleteAccountModal";

interface SettingsViewProps {
  initialSection?: "profile" | "appearance" | "currency" | "account";
  onClose?: () => void;
  onReplayTutorial?: () => void;
}

const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const CURRENCIES = [
  {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    desc: "Canonical ledger precision (integer-paise). Default base currency for PennyPilot.",
    isBase: true,
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    desc: "International reporting representation. Preserves exact integer ledger amounts.",
    isBase: false,
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    desc: "European reporting format. Strict integer precision without fabricated rates.",
    isBase: false,
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    desc: "UK reporting format. Precise numeric preservation.",
    isBase: false,
  },
];

const GENDER_OPTIONS = [
  "Prefer not to say",
  "Female",
  "Male",
  "Non-binary",
  "Other",
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialSection = "profile",
  onReplayTutorial,
}) => {
  const { user, token, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<"profile" | "appearance" | "currency" | "account">(initialSection);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleReplayTour = async () => {
    try {
      if (user) {
        localStorage.removeItem(`pennypilot_tutorial_completed_${user.id}`);
        localStorage.removeItem(`pennypilot_tutorial_skipped_${user.id}`);
        await updateTutorialStatus({ completed: false, skipped: false });
      }
      if (onReplayTutorial) {
        onReplayTutorial();
      } else {
        window.dispatchEvent(new CustomEvent("pennypilot:replay-tutorial"));
      }
      toast("Restarting guided product tour...", "info");
    } catch (err: any) {
      if (onReplayTutorial) {
        onReplayTutorial();
      } else {
        window.dispatchEvent(new CustomEvent("pennypilot:replay-tutorial"));
      }
    }
  };

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency || "INR");

  // Optional Age & Gender
  const userMetaKey = user ? `pennypilot_meta_${user.id}` : "pennypilot_meta";
  const [age, setAge] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`${userMetaKey}_age`);
      return saved || "";
    }
    return "";
  });
  const [gender, setGender] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`${userMetaKey}_gender`);
      return saved || "Prefer not to say";
    }
    return "Prefer not to say";
  });

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentAvatarSrc = getAvatarImageUrl(user, token);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setSelectedCurrency(user.currency || "INR");
    }
  }, [user]);

  // Handle Google OAuth callback feedback in Settings
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const statusParam = searchParams.get("status");
    const errorParam = searchParams.get("error");

    if (statusParam === "google_linked") {
      toast("Google account linked successfully! You can now use Google Sign-In.", "success");
      setActiveSection("account");
    } else if (errorParam === "identity_already_linked") {
      toast("This Google account is already linked to another PennyPilot user profile.", "error");
      setActiveSection("account");
    } else if (errorParam === "linking_user_missing" || errorParam === "linking_session_invalidated") {
      toast("Google account linking timed out or session expired. Please try again.", "error");
      setActiveSection("account");
    }

    if (statusParam || errorParam) {
      if (window.history?.replaceState) {
        searchParams.delete("status");
        searchParams.delete("error");
        const remainingQuery = searchParams.toString();
        const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "") + (window.location.hash || "");
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  const getUserInitials = (name?: string, email?: string): string => {
    const raw = (name || email || "PP").trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  };

  // Profile Picture File Selection with Preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setAvatarError("Only JPEG, PNG, or WebP images are permitted.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAvatarError("Image file size must be 2MB or less.");
      return;
    }

    setSelectedFile(file);

    // Create local object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      const updatedUser = await uploadAvatar(selectedFile);
      updateUser(updatedUser);
      setSelectedFile(null);
      setAvatarPreview(null);
      toast("Profile picture updated successfully.", "success");
    } catch (err: any) {
      setAvatarError(err.message || "Failed to upload profile picture.");
      toast(err.message || "Upload failed", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCancelAvatarPreview = () => {
    setSelectedFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      const updatedUser = await deleteAvatar();
      updateUser(updatedUser);
      setAvatarPreview(null);
      setSelectedFile(null);
      toast("Profile picture removed.", "success");
    } catch (err: any) {
      setAvatarError(err.message || "Failed to remove profile picture.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast("Display name must be at least 2 characters.", "error");
      return;
    }

    // Validate optional age
    if (age) {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        toast("Please enter a valid age between 13 and 120, or leave blank.", "error");
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const updated = await updateUserProfile({
        display_name: trimmedName,
        currency: selectedCurrency,
      });
      updateUser(updated);

      // Persist optional age and gender
      if (typeof window !== "undefined") {
        localStorage.setItem(`${userMetaKey}_age`, age);
        localStorage.setItem(`${userMetaKey}_gender`, gender);
      }

      toast("Profile preferences saved successfully.", "success");
    } catch (err: any) {
      toast(err.message || "Failed to save profile.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Send Password Reset Link
  const handleSendPasswordReset = async () => {
    if (!user?.email) return;

    setIsSendingReset(true);
    try {
      await forgotPassword(user.email);
      toast(`Password reset instructions sent to ${user.email}.`, "success");
    } catch (err: any) {
      toast(err.message || "Failed to dispatch reset email.", "error");
    } finally {
      setIsSendingReset(false);
    }
  };

  // Link Google Account
  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      const res = await linkGoogleAccount();
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      }
    } catch (err: any) {
      toast(err.message || "Failed to initiate Google account linking.", "error");
      setIsLinkingGoogle(false);
    }
  };

  // Unlink Google Account
  const handleUnlinkGoogle = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Google account? You will need to sign in using your email and password.")) {
      return;
    }
    setIsUnlinkingGoogle(true);
    try {
      const updatedUser = await unlinkGoogleAccount();
      updateUser(updatedUser);
      toast("Google account unlinked successfully.", "success");
    } catch (err: any) {
      toast(err.message || "Failed to unlink Google account.", "error");
    } finally {
      setIsUnlinkingGoogle(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto animate-fade-in pb-12 min-w-0">
      {/* Top Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <span className="text-[10px] sm:text-[11px] font-sans font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          Preferences & Governance
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage your personal identity, theme preference, currency formatting, and account security.
        </p>
      </div>

      {/* Settings Layout: Tabs + Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-0">
        {/* Navigation Sidebar */}
        <div className="space-y-1.5 md:col-span-1">
          <button
            type="button"
            onClick={() => setActiveSection("profile")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
              activeSection === "profile"
                ? "bg-slate-900 text-white dark:bg-teal-500/15 dark:text-teal-300 dark:border dark:border-teal-400/30 dark:shadow-[0_0_12px_rgba(45,212,191,0.2)] font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <UserIcon className="w-4 h-4 shrink-0" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("appearance")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
              activeSection === "appearance"
                ? "bg-slate-900 text-white dark:bg-teal-500/15 dark:text-teal-300 dark:border dark:border-teal-400/30 dark:shadow-[0_0_12px_rgba(45,212,191,0.2)] font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <Sun className="w-4 h-4 shrink-0" />
            <span>Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("currency")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
              activeSection === "currency"
                ? "bg-slate-900 text-white dark:bg-teal-500/15 dark:text-teal-300 dark:border dark:border-teal-400/30 dark:shadow-[0_0_12px_rgba(45,212,191,0.2)] font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span>Currency</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("account")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-left cursor-pointer ${
              activeSection === "account"
                ? "bg-slate-900 text-white dark:bg-teal-500/15 dark:text-teal-300 dark:border dark:border-teal-400/30 dark:shadow-[0_0_12px_rgba(45,212,191,0.2)] font-semibold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Account & Security</span>
          </button>
        </div>

        {/* Settings Content Panel */}
        <div className="md:col-span-3 min-w-0">
          {/* SECTION 1: PROFILE */}
          {activeSection === "profile" && (
            <div className="bg-white dark:bg-[#121C28] rounded-2xl p-5 sm:p-7 space-y-6 border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Personal Profile</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Update your profile picture and personal identity details.
                </p>
              </div>

              {/* Profile Picture Upload & Preview */}
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Profile Picture
                </span>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  {/* Avatar Display */}
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shrink-0 shadow-sm relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : currentAvatarSrc ? (
                      <img
                        src={currentAvatarSrc}
                        alt={user?.display_name || user?.email}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-700 to-teal-900 text-white flex items-center justify-center font-mono text-xl font-bold select-none">
                        {getUserInitials(user?.display_name, user?.email)}
                      </div>
                    )}
                  </div>

                  {/* Actions & Explanations */}
                  <div className="flex-1 space-y-2.5 text-center sm:text-left">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Upload a square photo (JPEG, PNG, or WebP). Maximum file size is 2MB.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-label="Upload profile picture"
                    />

                    {avatarError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{avatarError}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      {avatarPreview ? (
                        <>
                          <button
                            type="button"
                            disabled={isUploadingAvatar}
                            onClick={handleSaveAvatar}
                            className="btn-primary text-xs px-3.5 py-1.5 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isUploadingAvatar ? "Saving..." : "Save Picture"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelAvatarPreview}
                            className="btn-secondary text-xs px-3 py-1.5 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-secondary text-xs px-3.5 py-2 cursor-pointer shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>{currentAvatarSrc ? "Change Picture" : "Upload Picture"}</span>
                          </button>

                          {currentAvatarSrc && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              disabled={isUploadingAvatar}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Form Details */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="settings-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Display Name
                  </label>
                  <input
                    id="settings-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-base"
                    placeholder="Your Full Name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="settings-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Read-only (Primary Account Key)</span>
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="input-base bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-90"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    For your security, email address changes require verification via account recovery.
                  </p>
                </div>

                {/* Optional Demographics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label htmlFor="settings-age" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span>Age</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="settings-age"
                      type="number"
                      min={13}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 28"
                      className="input-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="settings-gender" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span>Gender</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      id="settings-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="input-base bg-white dark:bg-slate-900"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn-primary text-xs sm:text-sm px-5 py-2.5 font-medium shadow-xs cursor-pointer"
                  >
                    <span>{isSavingProfile ? "Saving Details..." : "Save Profile Details"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 2: APPEARANCE */}
          {activeSection === "appearance" && (
            <div className="bg-white dark:bg-[#121C28] rounded-2xl p-5 sm:p-7 space-y-6 border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Theme & Appearance</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Select your visual theme. Changes apply instantly and persist across sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Theme Card */}
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-4 sm:p-5 rounded-xl border text-left transition-all relative space-y-3 cursor-pointer ${
                    theme === "light"
                      ? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/30 dark:bg-teal-950/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    {theme === "light" && (
                      <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Quiet Ledger (Light)</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Warm light neutral canvas, solid white cards, and crisp slate ink typography. (Default)
                    </p>
                  </div>
                </button>

                {/* Dark Theme Card */}
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`p-4 sm:p-5 rounded-xl border text-left transition-all relative space-y-3 cursor-pointer ${
                    theme === "dark"
                      ? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/30 dark:bg-teal-950/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-100 flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    {theme === "dark" && (
                      <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Midnight Ledger (Dark)</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Midnight sapphire-slate glass canvas (#0C131D), frosted translucent cards, and ambient glow accents.
                    </p>
                  </div>
                </button>
              </div>

              {/* Product Tour Replay Section */}
              <div className="pt-5 border-t border-slate-200/80 dark:border-slate-800">
                <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-ledger-teal flex items-center justify-center shrink-0 border border-teal-500/25">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        First-Time User Guided Tour
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Revisit the interactive 6-step walkthrough explaining Cash Flow, Ledger, Budgets, Analytics, Insights, and AI Copilot.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReplayTour}
                    className="btn-secondary text-xs px-4 py-2 shrink-0 cursor-pointer shadow-xs focus-ring"
                  >
                    <span>Replay Tutorial</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CURRENCY */}
          {activeSection === "currency" && (
            <div className="bg-white dark:bg-[#121C28] rounded-2xl p-5 sm:p-7 space-y-6 border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Currency & Financial Reporting</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Configure reporting currency formatting across your financial views.
                </p>
              </div>

              {/* Strict Financial Notice */}
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/60 dark:bg-teal-950/30 dark:border-teal-800/60 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed">
                <span className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 font-sans tracking-wide text-xs">
                  <Coins className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Canonical Ledger Integrity Guarantee
                </span>
                <p>
                  PennyPilot records and balances all transactions in integer paise (₹1.00 = 100 paise) in pure Python without floating-point errors.
                  Changing your reporting currency adapts formatting representations while strictly guaranteeing that exchange rates are never fabricated.
                </p>
              </div>

              <div className="space-y-3">
                {CURRENCIES.map((curr) => {
                  const isSelected = selectedCurrency === curr.code;
                  return (
                    <div
                      key={curr.code}
                      onClick={async () => {
                        setSelectedCurrency(curr.code);
                        try {
                          const updated = await updateUserProfile({ currency: curr.code });
                          updateUser(updated);
                          toast(`Reporting currency set to ${curr.code} (${curr.name}).`, "success");
                        } catch (err: any) {
                          toast(err.message || "Failed to update currency", "error");
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? "border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/30 dark:bg-teal-950/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-lg text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-xs">
                          {curr.symbol}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 font-mono">
                              {curr.code}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{curr.name}</span>
                            {curr.isBase && (
                              <span className="text-[9px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-700">
                                Ledger Base
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{curr.desc}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 4: ACCOUNT & SECURITY */}
          {activeSection === "account" && (
            <div className="bg-white dark:bg-[#121C28] rounded-2xl p-5 sm:p-7 space-y-6 border border-slate-200 dark:border-slate-800/80 shadow-xs">
              <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Account & Security</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Manage authentication credentials, session security, and account status.
                </p>
              </div>

              {/* Account Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Account Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {user?.is_active ? "Active & Protected" : "Pending"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block">
                    {user?.email_verified ? "Email verification confirmed" : "Verification pending"}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sign-in Method
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    {user?.linked_providers && user.linked_providers.includes("google")
                      ? "Google OAuth 2.0 PKCE"
                      : "Password & Verified Email"}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block">
                    Secure JWT session rotation enabled
                  </span>
                </div>
              </div>

              {/* Google OAuth Connection Card */}
              {(() => {
                const isGoogleLinked = Boolean(user?.linked_providers && user.linked_providers.includes("google"));
                const hasPassword = Boolean(user?.has_password);

                return (
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
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
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Google Sign-In Connection
                          </h3>
                          {isGoogleLinked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                              <Check className="w-3 h-3" /> Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Not Connected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                          {isGoogleLinked
                            ? "Your Google account is connected. You can sign in using either your password or 'Continue with Google'."
                            : "Connect your Google account to enable instant, single-click sign-in with 'Continue with Google'."}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isGoogleLinked ? (
                          <button
                            type="button"
                            onClick={handleUnlinkGoogle}
                            disabled={isUnlinkingGoogle || !hasPassword}
                            title={!hasPassword ? "Please set a password first to prevent account lockout" : "Unlink Google account"}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
                          >
                            <span>{isUnlinkingGoogle ? "Unlinking..." : "Disconnect Google"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleLinkGoogle}
                            disabled={isLinkingGoogle}
                            className="btn-primary text-xs px-3.5 py-2 inline-flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            {isLinkingGoogle ? (
                              <span>Connecting...</span>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                                <span>Link Google Account</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isGoogleLinked && !hasPassword && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        Notice: You signed up with Google and haven't set a password. To disconnect Google in the future, first use "Password & Recovery" below to create a password.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Password Recovery Trigger */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Password & Recovery</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      Send a secure, single-use password reset link to your registered email address ({user?.email}).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendPasswordReset}
                    disabled={isSendingReset}
                    className="btn-secondary text-xs px-3.5 py-2 shrink-0 cursor-pointer shadow-xs"
                  >
                    <span>{isSendingReset ? "Sending..." : "Send Reset Link"}</span>
                  </button>
                </div>
              </div>

              {/* Danger Zone: Sign Out */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Session Control</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Sign out of PennyPilot on this browser.</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Danger Zone: Permanent Account Deletion */}
              <div className="pt-6 border-t border-rose-200 dark:border-rose-900/60 space-y-3">
                <div className="p-4 sm:p-5 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Danger Zone: Permanent Account Deletion</span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                        Permanently purge your account, profile credentials, and all recorded financial transactions, budgets, and audit history. This action cannot be undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all shadow-xs cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permanent Account Deletion Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
