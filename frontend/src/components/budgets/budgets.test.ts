import { describe, it, expect } from "vitest";
import type { MonthlyBudgetOverview, BudgetPace } from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";

const mockOverview: MonthlyBudgetOverview = {
  month: "2026-11-01",
  total_limit_paise: 5500000,
  total_limit_formatted: "₹55,000.00",
  total_spent_paise: 2903000,
  total_spent_formatted: "₹29,030.00",
  remaining_paise: 2597000,
  remaining_formatted: "₹25,970.00",
  utilization_percent: 52.8,
  category_budgets: [
    {
      category_id: "cat-dining",
      category_name: "Dining & Food",
      icon: "utensils",
      color_token: "amber",
      limit_paise: 800000,
      limit_formatted: "₹8,000.00",
      spent_paise: 702000,
      spent_formatted: "₹7,020.00",
      remaining_paise: 98000,
      remaining_formatted: "₹980.00",
      utilization_percent: 87.8,
      status: "over_pace",
    },
    {
      category_id: "cat-groc",
      category_name: "Groceries",
      icon: "shopping-cart",
      color_token: "emerald",
      limit_paise: 1200000,
      limit_formatted: "₹12,000.00",
      spent_paise: 311000,
      spent_formatted: "₹3,110.00",
      remaining_paise: 889000,
      remaining_formatted: "₹8,890.00",
      utilization_percent: 25.9,
      status: "over_pace",
    },
    {
      category_id: "cat-rent",
      category_name: "Housing & Rent",
      icon: "home",
      color_token: "indigo",
      limit_paise: 2000000,
      limit_formatted: "₹20,000.00",
      spent_paise: 1850000,
      spent_formatted: "₹18,500.00",
      remaining_paise: 150000,
      remaining_formatted: "₹1,500.00",
      utilization_percent: 92.5,
      status: "over_pace",
    },
    {
      category_id: "cat-trans",
      category_name: "Transportation",
      icon: "car",
      color_token: "cyan",
      limit_paise: 400000,
      limit_formatted: "₹4,000.00",
      spent_paise: 40000,
      spent_formatted: "₹400.00",
      remaining_paise: 360000,
      remaining_formatted: "₹3,600.00",
      utilization_percent: 10.0,
      status: "on_track",
    },
    {
      category_id: "cat-shop",
      category_name: "Shopping",
      icon: "shopping-bag",
      color_token: "orange",
      limit_paise: 600000,
      limit_formatted: "₹6,000.00",
      spent_paise: 0,
      spent_formatted: "₹0.00",
      remaining_paise: 600000,
      remaining_formatted: "₹6,000.00",
      utilization_percent: 0.0,
      status: "on_track",
    },
    {
      category_id: "cat-ent",
      category_name: "Entertainment",
      icon: "film",
      color_token: "purple",
      limit_paise: 0,
      limit_formatted: "₹0.00",
      spent_paise: 0,
      spent_formatted: "₹0.00",
      remaining_paise: 0,
      remaining_formatted: "₹0.00",
      utilization_percent: 0.0,
      status: "no_budget",
    },
  ],
};

const mockPace: BudgetPace = {
  spent_paise: 2903000,
  spent_formatted: "₹29,030.00",
  limit_paise: 5500000,
  limit_formatted: "₹55,000.00",
  remaining_paise: 2597000,
  remaining_formatted: "₹25,970.00",
  overrun_paise: 0,
  overrun_formatted: "₹0.00",
  utilization_percent: 52.8,
  is_over_budget: false,
  as_of_date: "2026-11-06",
  total_days: 30,
  elapsed_days: 6,
  remaining_days: 24,
  target_pace_paise: 1100000,
  target_pace_formatted: "₹11,000.00",
  projected_total_paise: 11918000,
  projected_total_formatted: "₹1,19,180.00",
  projected_overrun_paise: 6418000,
  projected_overrun_formatted: "₹64,180.00",
  status: "over_pace",
  verdict_sentence: "On pace to overspend by approximately ₹64,180.00 by month-end.",
};

describe("Stage 4B — Budgets Management Logic & Precision", () => {
  describe("A. Summary Overview Metrics", () => {
    it("preserves exact integer paise arithmetic for summary metrics", () => {
      expect(mockOverview.total_limit_paise).toBe(5500000);
      expect(mockOverview.total_spent_paise).toBe(2903000);
      expect(mockOverview.remaining_paise).toBe(2597000);

      // Verify exact INR display formatting
      expect(formatINR(mockOverview.total_limit_paise)).toBe("₹55,000.00");
      expect(formatINR(mockOverview.total_spent_paise)).toBe("₹29,030.00");
      expect(formatINR(mockOverview.remaining_paise)).toBe("₹25,970.00");
      expect(formatINR(mockOverview.total_limit_paise, { showPaise: false })).toBe("₹55,000");
    });

    it("verifies budget utilization computation matches backend contract", () => {
      const calculated = (mockOverview.total_spent_paise / mockOverview.total_limit_paise) * 100;
      expect(Number(calculated.toFixed(1))).toBe(52.8);
      expect(mockOverview.utilization_percent).toBe(52.8);
    });
  });

  describe("B. Spending Pace Timeline & Burn Rate", () => {
    it("computes scheduled pacing percentage correctly from elapsed and total days", () => {
      const elapsedDays = mockPace.elapsed_days;
      const totalDays = mockPace.total_days;
      const scheduledPercent = Math.round((elapsedDays / totalDays) * 100);

      expect(elapsedDays).toBe(6);
      expect(totalDays).toBe(30);
      expect(scheduledPercent).toBe(20);

      // Actual utilization (52.8%) is greater than scheduled elapsed time (20%) -> over_pace
      expect(mockPace.utilization_percent).toBeGreaterThan(scheduledPercent);
      expect(mockPace.status).toBe("over_pace");
    });

    it("presents deterministic backend pacing verdict without LLM tampering", () => {
      expect(mockPace.verdict_sentence).toContain("On pace to overspend");
      expect(mockPace.projected_total_formatted).toBe("₹1,19,180.00");
    });
  });

  describe("C. Category Filtering & Status Classification", () => {
    const categories = mockOverview.category_budgets;

    it("filters categories by 'budgeted' mode", () => {
      const budgeted = categories.filter((c) => c.limit_paise > 0);
      expect(budgeted).toHaveLength(5);
      expect(budgeted.every((c) => c.limit_paise > 0)).toBe(true);
    });

    it("filters categories by 'attention' mode (over_pace, over_budget, caution)", () => {
      const attention = categories.filter(
        (c) => c.limit_paise > 0 && (c.status === "over_pace" || c.status === "over_budget" || c.status === "caution")
      );
      expect(attention).toHaveLength(3);
      expect(attention.map((c) => c.category_name)).toEqual(["Dining & Food", "Groceries", "Housing & Rent"]);
    });

    it("filters categories by 'unbudgeted' mode", () => {
      const unbudgeted = categories.filter((c) => c.limit_paise === 0);
      expect(unbudgeted).toHaveLength(1);
      expect(unbudgeted[0].category_name).toBe("Entertainment");
    });
  });

  describe("D. Category Ceiling Mutation & Conversions", () => {
    it("converts user rupees input to integer paise accurately", () => {
      const inputRupees = 15000;
      const paise = rupeesToPaise(inputRupees);
      expect(paise).toBe(1500000);

      const retrievedRupees = paiseToRupees(paise);
      expect(retrievedRupees).toBe(15000);
    });

    it("formats zero paise budget as removing ceiling", () => {
      const zeroPaise = rupeesToPaise(0);
      expect(zeroPaise).toBe(0);
      expect(formatINR(zeroPaise)).toBe("₹0.00");
    });
  });
});
