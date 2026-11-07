import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Calendar,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  updateUserProfile,
  uploadAvatar,
  deleteAvatar,
  getAvatarImageUrl,
} from "../../lib/api";
import { useToast } from "../common/Toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const GENDER_OPTIONS = [
  "Prefer not to say",
  "Female",
  "Male",
  "Non-binary",
  "Other",
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+05:30)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST, UTC+04:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+08:00)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT, UTC-05:00)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT, UTC-08:00)" },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, token, updateUser } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [timezone, setTimezone] = useState(user?.timezone || "Asia/Kolkata");

  // Optional Age & Gender (persisted per user)
  const userMetaKey = user ? `pennypilot_meta_${user.id}` : "pennypilot_meta";
  const [age, setAge] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`${userMetaKey}_age`) || "";
    }
    return "";
  });
  const [gender, setGender] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`${userMetaKey}_gender`) || "Prefer not to say";
    }
    return "Prefer not to say";
  });

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isAvatarActionLoading, setIsAvatarActionLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || "");
      setTimezone(user.timezone || "Asia/Kolkata");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const getUserInitials = (name?: string, email?: string): string => {
    const raw = (name || email || "PP").trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    // 1. Client-side MIME type check
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      setAvatarError("Only JPEG, PNG, or WebP images are permitted.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Client-side size check (strictly <= 2MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAvatarError("Image file size must be less than 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    setIsAvatarActionLoading(true);
    setAvatarError(null);
    try {
      const updatedUser = await uploadAvatar(selectedFile);
      updateUser(updatedUser);
      setSelectedFile(null);
      setAvatarPreview(null);
      toast("Profile picture updated successfully.", "success");
    } catch (err: any) {
      setAvatarError(err.message || "Failed to upload profile picture.");
      toast(err.message || "Avatar upload failed.", "error");
    } finally {
      setIsAvatarActionLoading(false);
    }
  };

  const handleCancelAvatarPreview = () => {
    setSelectedFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    if (!user.avatar_url) return;

    setAvatarError(null);
    setIsAvatarActionLoading(true);
    try {
      const updatedUser = await deleteAvatar();
      updateUser(updatedUser);
      setAvatarPreview(null);
      setSelectedFile(null);
      toast("Profile picture removed.", "info");
    } catch (err: any) {
      setAvatarError(err.message || "Failed to remove profile picture.");
      toast(err.message || "Failed to remove avatar.", "error");
    } finally {
      setIsAvatarActionLoading(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setDetailsError("Display name must be at least 2 characters.");
      return;
    }

    // Validate optional age
    if (age) {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        setDetailsError("Please enter a valid age between 13 and 120, or leave blank.");
        return;
      }
    }

    setIsSavingDetails(true);
    try {
      const updatedUser = await updateUserProfile({
        display_name: trimmedName,
        timezone,
      });
      updateUser(updatedUser);

      // Persist optional age and gender
      if (typeof window !== "undefined") {
        localStorage.setItem(`${userMetaKey}_age`, age);
        localStorage.setItem(`${userMetaKey}_gender`, gender);
      }

      toast("Profile preferences updated successfully.", "success");
      onClose();
    } catch (err: any) {
      setDetailsError(err.message || "Failed to save profile changes.");
      toast(err.message || "Failed to update profile.", "error");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const avatarSrc = getAvatarImageUrl(user, token);

  const formattedCreatedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recently";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white dark:bg-[#121C28] max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
          <div>
            <h2 id="profile-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Edit Profile
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Manage your personal identity, avatar, and account preferences.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-ring"
            aria-label="Close profile modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Avatar Management Card with Preview before saving */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3.5">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Profile Picture
            </span>

            <div className="flex items-center gap-4">
              {/* Picture Display / Preview */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center shrink-0">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={user.display_name || user.email}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-mono text-xl font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 w-full h-full flex items-center justify-center select-none">
                    {getUserInitials(user.display_name, user.email)}
                  </span>
                )}
                {isAvatarActionLoading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isAvatarActionLoading}
                  aria-label="Upload profile image"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  {avatarPreview ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveAvatar}
                        disabled={isAvatarActionLoading}
                        className="btn-primary text-xs px-3.5 py-1.5 min-h-[32px] cursor-pointer shadow-xs focus-ring"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Picture</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAvatarPreview}
                        className="btn-secondary text-xs px-3 py-1.5 min-h-[32px] cursor-pointer focus-ring"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAvatarActionLoading}
                        className="btn-secondary text-xs px-3.5 py-1.5 min-h-[32px] cursor-pointer shadow-xs focus-ring"
                      >
                        <Upload className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>{user.avatar_url ? "Change Picture" : "Upload Picture"}</span>
                      </button>

                      {user.avatar_url && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          disabled={isAvatarActionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer focus-ring"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  JPEG, PNG, or WebP. Max 2MB. Preview before saving.
                </p>
              </div>
            </div>

            {avatarError && (
              <div
                className="flex items-start gap-2 p-2.5 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-400 text-xs"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{avatarError}</span>
              </div>
            )}
          </div>

          {/* User Details Form */}
          <form onSubmit={handleSaveDetails} className="space-y-4">
            {detailsError && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-400 text-xs"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{detailsError}</span>
              </div>
            )}

            {/* Email (Read-Only) */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span>Email Address</span>
                <span className="text-[10px] text-slate-500 font-normal lowercase">read-only</span>
              </label>
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">{user.email}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified</span>
                </span>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-displayName"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Display Name
              </label>
              <input
                id="profile-displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name"
                className="input-base text-xs sm:text-sm"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            {/* Optional Age & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-age"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <span>Age</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="profile-age"
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 29"
                  className="input-base text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-gender"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <span>Gender</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  id="profile-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="input-base text-xs sm:text-sm bg-white dark:bg-slate-900"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-timezone"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Timezone</span>
              </label>
              <select
                id="profile-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="input-base text-xs sm:text-sm bg-white dark:bg-slate-900"
              >
                {TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Metadata Badge */}
            <div className="pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Member since {formattedCreatedDate}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Protected Account</span>
              </span>
            </div>

            {/* Action Footer */}
            <div className="pt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSavingDetails}
                className="btn-secondary text-xs sm:text-sm px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingDetails}
                className="btn-primary text-xs sm:text-sm px-5 py-2 font-medium shadow-xs cursor-pointer"
              >
                {isSavingDetails ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
