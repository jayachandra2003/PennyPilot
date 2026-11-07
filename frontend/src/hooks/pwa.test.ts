import { describe, it, expect, beforeEach } from "vitest";

// In-memory localStorage polyfill for Node vitest environment
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

const DISMISSAL_KEY = "pennypilot_pwa_install_dismissed";
const DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function isPWADismissed(storage: MockLocalStorage, now: number): boolean {
  const dismissedAt = storage.getItem(DISMISSAL_KEY);
  if (!dismissedAt) return false;
  const elapsed = now - parseInt(dismissedAt, 10);
  return elapsed < DISMISSAL_COOLDOWN_MS;
}

function isIOSSafari(ua: string): boolean {
  const lower = ua.toLowerCase();
  const isApple = /iphone|ipad|ipod/.test(lower);
  const isSafari = /safari/.test(lower) && !/chrome|crios|crmo|android/.test(lower);
  return isApple && isSafari;
}

describe("PWA Installability & Storage Logic", () => {
  let storage: MockLocalStorage;

  beforeEach(() => {
    storage = new MockLocalStorage();
  });

  it("is not dismissed when storage is clean", () => {
    expect(isPWADismissed(storage, Date.now())).toBe(false);
  });

  it("is dismissed immediately after user dismisses prompt", () => {
    const now = 1700000000000;
    storage.setItem(DISMISSAL_KEY, now.toString());
    expect(isPWADismissed(storage, now + 1000)).toBe(true);
  });

  it("remains dismissed within the 14-day cooldown window", () => {
    const now = 1700000000000;
    storage.setItem(DISMISSAL_KEY, now.toString());
    // 13 days later
    const thirteenDays = 13 * 24 * 60 * 60 * 1000;
    expect(isPWADismissed(storage, now + thirteenDays)).toBe(true);
  });

  it("resets dismissal state after 14 days have passed", () => {
    const now = 1700000000000;
    storage.setItem(DISMISSAL_KEY, now.toString());
    // 15 days later
    const fifteenDays = 15 * 24 * 60 * 60 * 1000;
    expect(isPWADismissed(storage, now + fifteenDays)).toBe(false);
  });

  it("correctly detects iOS Safari user agent", () => {
    const iosSafariUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(isIOSSafari(iosSafariUA)).toBe(true);
  });

  it("does not flag Android Chrome or iOS Chrome as iOS Safari", () => {
    const androidChromeUA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    const iosChromeUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1";
    expect(isIOSSafari(androidChromeUA)).toBe(false);
    expect(isIOSSafari(iosChromeUA)).toBe(false);
  });
});
