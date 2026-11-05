/**
 * Session persistence helpers for PennyPilot client.
 * Manages explicit user sign-out state across page reloads.
 */

export const LOGGED_OUT_KEY = "pennypilot_logged_out";

export function isExplicitlyLoggedOut(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  return localStorage.getItem(LOGGED_OUT_KEY) === "true";
}

export function setExplicitlyLoggedOut(loggedOut: boolean): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (loggedOut) {
    localStorage.setItem(LOGGED_OUT_KEY, "true");
  } else {
    localStorage.removeItem(LOGGED_OUT_KEY);
  }
}
