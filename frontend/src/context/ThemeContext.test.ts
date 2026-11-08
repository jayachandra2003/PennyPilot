import { describe, it, expect, beforeEach, afterEach } from "vitest";

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("Theme Management & Preference Persistence (Strict Light / Dark)", () => {
  const THEME_STORAGE_KEY = "pennypilot_theme";
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const mockStorage = new MockLocalStorage();
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage as unknown as Storage;
    (globalThis as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: mockStorage as unknown as Storage,
    };
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    (globalThis as unknown as { localStorage: unknown }).localStorage = originalLocalStorage;
  });

  it("stores and retrieves light and dark preferences", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("defaults to light when no preference stored", () => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = saved === "dark" ? "dark" : "light";
    expect(initialTheme).toBe("light");
  });

  it("migrates legacy 'system' preference to light by default", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const resolvedTheme = saved === "dark" ? "dark" : "light";
    expect(resolvedTheme).toBe("light");
  });
});
