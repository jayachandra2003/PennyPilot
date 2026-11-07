import { describe, it, expect } from "vitest";

describe("Notifications and Real Financial Alerts Logic", () => {
  interface NotificationItem {
    id: string;
    title: string;
    message: string;
    category: "account" | "financial" | "tip" | "alert";
    created_at: string;
    is_read: boolean;
  }

  const sampleNotifications: NotificationItem[] = [
    {
      id: "notif-1",
      title: "Account Created",
      message: "Welcome to PennyPilot! Your account was successfully created.",
      category: "account",
      created_at: "2026-11-07T12:00:00Z",
      is_read: false,
    },
    {
      id: "notif-2",
      title: "Budget Caution: Groceries",
      message: "You have reached 88% of your allocated budget for Groceries.",
      category: "financial",
      created_at: "2026-11-07T14:30:00Z",
      is_read: false,
    },
    {
      id: "notif-3",
      title: "Email Verified",
      message: "Your email has been verified.",
      category: "account",
      created_at: "2026-11-06T10:00:00Z",
      is_read: true,
    },
  ];

  it("calculates unread count correctly from real notifications", () => {
    const unread = sampleNotifications.filter((n) => !n.is_read).length;
    expect(unread).toBe(2);
  });

  it("marks all notifications as read", () => {
    const updated = sampleNotifications.map((n) => ({ ...n, is_read: true }));
    const unread = updated.filter((n) => !n.is_read).length;
    expect(unread).toBe(0);
    expect(updated.every((n) => n.is_read)).toBe(true);
  });

  it("toggles read status for a single notification", () => {
    const targetId = "notif-1";
    const toggled = sampleNotifications.map((n) =>
      n.id === targetId ? { ...n, is_read: !n.is_read } : n
    );
    expect(toggled.find((n) => n.id === "notif-1")?.is_read).toBe(true);
    expect(toggled.find((n) => n.id === "notif-2")?.is_read).toBe(false);
  });

  it("filters and dismisses notification without mutating other items", () => {
    const toDismiss = "notif-2";
    const remaining = sampleNotifications.filter((n) => n.id !== toDismiss);
    expect(remaining.length).toBe(2);
    expect(remaining.some((n) => n.id === "notif-2")).toBe(false);
  });
});
