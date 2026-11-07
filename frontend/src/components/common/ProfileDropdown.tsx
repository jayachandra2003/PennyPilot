import React, { useState, useRef, useEffect } from "react";
import {
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Coins,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getAvatarImageUrl } from "../../lib/api";

interface ProfileDropdownProps {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  onOpenProfile,
  onOpenSettings,
}) => {
  const { user, token, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const avatarSrc = getAvatarImageUrl(user, token);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getUserInitials = (name?: string, email?: string): string => {
    const raw = (name || email || "PP").trim();
    const parts = raw.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Modern Circular Avatar Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User profile and settings menu"
        className="group flex items-center gap-2 p-1 rounded-full border border-ledger-border hover:border-ledger-teal/70 bg-ledger-surface transition-all duration-200 focus-ring cursor-pointer select-none"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-ledger-surfaceSubtle flex items-center justify-center shrink-0 border border-ledger-borderSubtle">
          {avatarSrc && !imageFailed ? (
            <img
              src={avatarSrc}
              alt={user.display_name || user.email}
              onError={() => setImageFailed(true)}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-700 to-teal-900 text-white flex items-center justify-center font-mono text-xs sm:text-sm font-bold select-none tracking-tight">
              {getUserInitials(user.display_name, user.email)}
            </div>
          )}
        </div>

        {/* Display name preview on large desktop */}
        <span className="hidden xl:inline-block pr-2.5 text-xs sm:text-sm font-semibold text-ledger-ink group-hover:text-ledger-teal transition-colors max-w-[130px] truncate text-left">
          {user.display_name || user.email.split("@")[0]}
        </span>
      </button>

      {/* Modern Profile Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Profile options"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-[#141F2E] border border-slate-200 dark:border-white/15 rounded-2xl shadow-float z-50 p-2 text-ledger-ink animate-fade-in select-none"
        >
          {/* Section 1: User Identity Summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ledger-surfaceSubtle/70 backdrop-blur-md border border-ledger-borderSubtle mb-2">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-ledger-surface shrink-0 border border-ledger-border">
              {avatarSrc && !imageFailed ? (
                <img
                  src={avatarSrc}
                  alt={user.display_name || user.email}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-700 to-teal-900 text-white flex items-center justify-center font-mono text-sm font-bold select-none">
                  {getUserInitials(user.display_name, user.email)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-ledger-ink truncate block">
                  {user.display_name || "PennyPilot User"}
                </span>
                {user.email_verified && (
                  <span title="Verified Account">
                    <ShieldCheck className="w-3.5 h-3.5 text-ledger-teal shrink-0" />
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono text-ledger-inkMuted truncate block">
                {user.email}
              </span>
            </div>
          </div>

          {/* Section 2: Primary Actions */}
          <div className="space-y-0.5 border-b border-ledger-borderSubtle pb-2 mb-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-ledger-ink hover:bg-ledger-surfaceSubtle transition-colors focus-ring"
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-4 h-4 text-ledger-teal" />
                <span>Edit Profile</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-ledger-inkSubtle" />
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-ledger-ink hover:bg-ledger-surfaceSubtle transition-colors focus-ring"
            >
              <div className="flex items-center gap-2.5">
                <SettingsIcon className="w-4 h-4 text-ledger-teal" />
                <span>Settings</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-ledger-inkSubtle" />
            </button>
          </div>

          {/* Section 3: Appearance / Theme Selector */}
          <div className="px-3 py-2 border-b border-ledger-borderSubtle pb-2.5 mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-ledger-inkMuted font-mono uppercase tracking-wider">
                Appearance
              </span>
              <span className="text-[10px] text-ledger-inkSubtle capitalize">{theme}</span>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-ledger-surfaceSubtle p-0.5 rounded-lg border border-ledger-borderSubtle">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  theme === "light"
                    ? "bg-ledger-surface text-ledger-teal font-bold shadow-xs border border-ledger-border"
                    : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  theme === "dark"
                    ? "bg-ledger-surface text-ledger-teal font-bold shadow-xs border border-ledger-border"
                    : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  theme === "system"
                    ? "bg-ledger-surface text-ledger-teal font-bold shadow-xs border border-ledger-border"
                    : "text-ledger-inkMuted hover:text-ledger-ink"
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Section 4: Currency Preference Preview */}
          <div className="px-3 py-2 border-b border-ledger-borderSubtle pb-2 mb-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full flex items-center justify-between text-xs text-ledger-ink hover:text-ledger-teal transition-colors"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-3.5 h-3.5 text-ledger-teal" />
                <span className="font-medium">Currency</span>
              </div>
              <span className="font-mono font-bold text-ledger-teal bg-ledger-tealLight px-2 py-0.5 rounded text-[11px] border border-ledger-teal/20">
                {user.currency || "INR"}
              </span>
            </button>
          </div>

          {/* Section 5: Sign Out */}
          <div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-ledger-red hover:bg-rose-50 dark:hover:bg-ledger-redLight transition-colors focus-ring"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
