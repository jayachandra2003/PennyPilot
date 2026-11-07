import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Lightbulb,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { NotificationItem } from "../../lib/api";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../lib/api";

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return "Yesterday";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export const NotificationsPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count ?? notifications.filter((n) => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllMutation.mutate();
  };

  const handleToggleRead = (item: NotificationItem) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "account":
        return {
          icon: UserCheck,
          color: "text-emerald-500 dark:text-emerald-400",
          bg: "bg-emerald-500/10 border-emerald-500/25",
          label: "Account",
        };
      case "alert":
        return {
          icon: AlertTriangle,
          color: "text-rose-500 dark:text-rose-400",
          bg: "bg-rose-500/10 border-rose-500/25",
          label: "Alert",
        };
      case "financial":
        return {
          icon: TrendingUp,
          color: "text-amber-500 dark:text-amber-400",
          bg: "bg-amber-500/10 border-amber-500/25",
          label: "Financial",
        };
      case "tip":
      default:
        return {
          icon: Lightbulb,
          color: "text-teal-500 dark:text-teal-300",
          bg: "bg-teal-500/10 border-teal-500/25",
          label: "Smart Tip",
        };
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Notification Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Notifications and financial alerts, ${unreadCount} unread`}
        className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-ledger-border bg-ledger-surface hover:bg-ledger-surfaceSubtle flex items-center justify-center text-ledger-inkMuted hover:text-ledger-ink transition-all focus-ring shadow-xs select-none cursor-pointer"
      >
        <Bell className="w-5 h-5 shrink-0" aria-hidden="true" />

        {/* Unread Indicator Pulse Dot */}
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ledger-teal shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notifications and alerts"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#141F2E] border border-slate-200 dark:border-white/15 rounded-2xl shadow-float z-50 overflow-hidden text-ledger-ink animate-fade-in select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-ledger-borderSubtle bg-ledger-surfaceSubtle/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ledger-ink">Notifications & Alerts</span>
              {unreadCount > 0 ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-ledger-teal/15 text-ledger-teal border border-ledger-teal/30 font-bold">
                  {unreadCount} new
                </span>
              ) : (
                <span className="text-[11px] font-mono text-ledger-inkSubtle">0 new</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markAllMutation.isPending}
                className="text-[11px] font-medium text-ledger-teal hover:text-ledger-tealHover transition-colors cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification Items List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-ledger-borderSubtle/60">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-ledger-inkSubtle">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-ledger-teal mx-auto opacity-80" />
                <p className="text-xs font-medium text-ledger-ink">All caught up!</p>
                <p className="text-[11px] text-ledger-inkSubtle leading-relaxed">
                  No active notifications or financial alerts right now. Real signals will appear as you record transactions.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const badge = getCategoryBadge(item.category);
                const Icon = badge.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleRead(item)}
                    className={`p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer group ${
                      !item.is_read
                        ? "bg-ledger-surfaceSubtle/40 dark:bg-teal-500/5 hover:bg-ledger-surfaceSubtle"
                        : "hover:bg-ledger-surfaceSubtle/30 opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* Badge Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${badge.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${badge.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-ledger-ink truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-ledger-inkSubtle shrink-0">
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-ledger-inkMuted leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${badge.bg} ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.link_path && (
                            <span className="text-[10px] text-ledger-teal flex items-center gap-0.5">
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {!item.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-ledger-teal" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-ledger-inkSubtle hover:text-ledger-ink rounded transition-opacity"
                      aria-label="Dismiss notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-ledger-surfaceSubtle/30 border-t border-ledger-borderSubtle text-center">
            <span className="text-[10px] text-ledger-inkSubtle">
              PennyPilot Financial Intelligence Engine
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
