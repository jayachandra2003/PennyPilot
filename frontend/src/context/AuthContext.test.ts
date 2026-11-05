import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isExplicitlyLoggedOut, setExplicitlyLoggedOut } from "./session";
import { clearStoredToken, getStoredToken, setStoredToken } from "../lib/api";

// Simple in-memory localStorage polyfill for Node vitest environment
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

describe("Stage 2 Authentication & Session Persistence", () => {
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

  it("defaults to not explicitly logged out when storage is clean", () => {
    expect(isExplicitlyLoggedOut()).toBe(false);
  });

  it("persists logged-out state in localStorage when explicitly signed out", () => {
    setExplicitlyLoggedOut(true);
    expect(isExplicitlyLoggedOut()).toBe(true);
    expect(localStorage.getItem("pennypilot_logged_out")).toBe("true");
  });

  it("removes logged-out flag upon explicit login or session reset", () => {
    setExplicitlyLoggedOut(true);
    expect(isExplicitlyLoggedOut()).toBe(true);

    setExplicitlyLoggedOut(false);
    expect(isExplicitlyLoggedOut()).toBe(false);
    expect(localStorage.getItem("pennypilot_logged_out")).toBeNull();
  });

  it("correctly manages JWT storage lifecycle with getStoredToken, setStoredToken, and clearStoredToken", () => {
    expect(getStoredToken()).toBeNull();

    setStoredToken("mock_jwt_access_token_12345");
    expect(getStoredToken()).toBe("mock_jwt_access_token_12345");

    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });

  it("ensures sign-out sets the logged-out flag and wipes the stored JWT token", () => {
    setStoredToken("active_session_token");
    setExplicitlyLoggedOut(false);

    // Simulate logout action
    clearStoredToken();
    setExplicitlyLoggedOut(true);

    expect(getStoredToken()).toBeNull();
    expect(isExplicitlyLoggedOut()).toBe(true);
  });

  it("simulates browser refresh after logout: logged-out state is preserved", () => {
    // User performs logout
    clearStoredToken();
    setExplicitlyLoggedOut(true);

    // Page reloads (simulated by checking storage directly)
    expect(isExplicitlyLoggedOut()).toBe(true);
    expect(getStoredToken()).toBeNull();
  });
});
