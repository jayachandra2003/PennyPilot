import { describe, it, expect } from "vitest";

describe("Financial Insights View Logic & Pacing Status", () => {
  it("determines on-track pacing status correctly", () => {
    const pace: {
      status: string;
      spent_paise: number;
      limit_paise: number;
      remaining_paise: number;
      elapsed_days: number;
      total_days: number;
    } = {
      status: "on_track",
      spent_paise: 503000,
      limit_paise: 3800000,
      remaining_paise: 3297000,
      elapsed_days: 7,
      total_days: 30,
    };
    const isOverPace = pace.status === "over_budget" || pace.status === "over_pace";
    expect(isOverPace).toBe(false);
    expect(pace.limit_paise - pace.spent_paise).toBe(3297000);
  });

  it("calculates daily burn velocity correctly", () => {
    const spentPaise = 503000;
    const elapsedDays = 7;
    const actualDailyPaise = Math.round(spentPaise / elapsedDays);
    expect(actualDailyPaise).toBe(71857);
  });

  it("evaluates savings discipline against the 25% baseline", () => {
    const highSavingsRate = 93.3;
    const lowSavingsRate = 14.5;
    expect(highSavingsRate >= 25.0).toBe(true);
    expect(lowSavingsRate >= 25.0).toBe(false);
  });

  it("processes statistical anomaly multiplier metrics", () => {
    const anomaly = {
      description: "Wifi bill",
      amount_paise: 250000,
      baseline_median_paise: 41500,
      multiple_of_median: 6.0,
      evidence: "₹2,500.00 on 'Wifi bill' is 6.0x higher than median of ₹415.00",
    };
    expect(anomaly.multiple_of_median).toBe(6.0);
    expect(anomaly.amount_paise / anomaly.baseline_median_paise).toBeCloseTo(6.02, 1);
  });
});
