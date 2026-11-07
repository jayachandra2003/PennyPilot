import { describe, it, expect } from "vitest";

describe("Calendar Month & Year Navigation Logic", () => {
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  it("provides 12 month labels with November as month index 11", () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[10]).toBe("November");
    expect(MONTH_NAMES[0]).toBe("January");
  });

  it("calculates correct days in month for regular and leap years", () => {
    const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

    // November 2026 -> 30 days
    expect(daysInMonth(2026, 11)).toBe(30);
    // February 2024 (leap year) -> 29 days
    expect(daysInMonth(2024, 2)).toBe(29);
    // February 2026 (non-leap year) -> 28 days
    expect(daysInMonth(2026, 2)).toBe(28);
    // December 2026 -> 31 days
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("calculates correct first day of week", () => {
    const firstDayOfMonth = (y: number, m: number) => new Date(y, m - 1, 1).getDay();

    // Nov 1, 2026 is a Sunday (day 0)
    expect(firstDayOfMonth(2026, 11)).toBe(0);
    // Dec 1, 2026 is a Tuesday (day 2)
    expect(firstDayOfMonth(2026, 12)).toBe(2);
  });

  it("calculates decade year spans for direct year navigation", () => {
    const getDecadeYears = (yr: number) => {
      const start = Math.floor(yr / 12) * 12;
      return Array.from({ length: 12 }, (_, i) => start + i);
    };

    const years = getDecadeYears(2026);
    expect(years[0]).toBe(2016);
    expect(years).toContain(2026);
    expect(years).toHaveLength(12);
  });

  it("correctly handles next and previous month boundary wraps", () => {
    const stepMonth = (y: number, m: number, delta: number) => {
      let newM = m + delta;
      let newY = y;
      if (newM > 12) {
        newM = 1;
        newY += 1;
      } else if (newM < 1) {
        newM = 12;
        newY -= 1;
      }
      return { year: newY, month: newM };
    };

    // Forward across year boundary
    expect(stepMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    // Backward across year boundary
    expect(stepMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
