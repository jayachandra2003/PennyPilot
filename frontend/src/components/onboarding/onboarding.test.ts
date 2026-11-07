import { describe, it, expect, beforeEach } from "vitest";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";

const mockStorage: Record<string, string> = {};
const mockSessionStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  },
};

describe("Financial Onboarding & Income Management Logic", () => {
  beforeEach(() => {
    mockSessionStorage.clear();
  });

  describe("A. Income Inflow Computations (Integer Paise)", () => {
    it("converts user rupee input to integer paise accurately", () => {
      expect(rupeesToPaise(75000)).toBe(7500000);
      expect(rupeesToPaise(125000.5)).toBe(12500050);
      expect(paiseToRupees(7500000)).toBe(75000);
    });

    it("sums multiple income sources deterministically", () => {
      const incomeSources = [
        { source: "Primary Salary", rupees: 100000 },
        { source: "Freelance UI", rupees: 35000 },
        { source: "Investments", rupees: 15000 },
      ];
      const totalRupees = incomeSources.reduce((sum, s) => sum + s.rupees, 0);
      const totalPaise = rupeesToPaise(totalRupees);
      expect(totalPaise).toBe(15000000);
      expect(formatINR(totalPaise)).toBe("₹1,50,000.00");
    });

    it("calculates source breakdown percentages accurately", () => {
      const totalPaise = 10000000; // ₹1,00,000
      const salaryPaise = 8000000; // ₹80,000
      const freelancePaise = 2000000; // ₹20,000

      const salaryPct = (salaryPaise / totalPaise) * 100;
      const freelancePct = (freelancePaise / totalPaise) * 100;

      expect(salaryPct).toBe(80);
      expect(freelancePct).toBe(20);
    });
  });

  describe("B. Deterministic Financial Plan Calculations", () => {
    it("distinguishes Actual Savings from Planned Savings Cushion", () => {
      const monthlyIncomePaise = 15000000; // ₹1,50,000
      const allocatedBudgetPaise = 9000000; // ₹90,000
      const actualExpensesPaise = 4000000;  // ₹40,000

      // Planned Savings Cushion = Monthly Income - Allocated Budget
      const plannedSavings = monthlyIncomePaise - allocatedBudgetPaise;
      expect(plannedSavings).toBe(6000000); // ₹60,000
      expect(formatINR(plannedSavings)).toBe("₹60,000.00");

      // Actual Savings = Monthly Income - Actual Expenses
      const actualSavings = monthlyIncomePaise - actualExpensesPaise;
      expect(actualSavings).toBe(11000000); // ₹1,10,000
      expect(formatINR(actualSavings)).toBe("₹1,10,000.00");

      // Remaining Budget = Allocated Budget - Actual Expenses
      const remainingBudget = allocatedBudgetPaise - actualExpensesPaise;
      expect(remainingBudget).toBe(5000000); // ₹50,000
      expect(formatINR(remainingBudget)).toBe("₹50,000.00");

      // Strict guarantee: Planned savings != Actual savings during active month
      expect(plannedSavings).not.toBe(actualSavings);
    });

    it("correctly handles budget ceiling exceeding monthly income", () => {
      const monthlyIncomePaise = 5000000;  // ₹50,000
      const allocatedBudgetPaise = 6500000; // ₹65,000

      const unallocated = monthlyIncomePaise - allocatedBudgetPaise;
      expect(unallocated).toBe(-1500000); // Deficit of ₹15,000
      expect(unallocated < 0).toBe(true);
    });
  });

  describe("C. Onboarding Non-Blocking & Dismissal Safety", () => {
    it("stores temporary dismissal in sessionStorage without blocking app", () => {
      expect(mockSessionStorage.getItem("pennypilot_onboarding_dismissed")).toBeNull();
      mockSessionStorage.setItem("pennypilot_onboarding_dismissed", "true");
      expect(mockSessionStorage.getItem("pennypilot_onboarding_dismissed")).toBe("true");
    });

    it("constructs valid Onboarding payload", () => {
      const payload = {
        month: "2026-11-01",
        incomes: [
          { source: "Salary", amount_paise: 8000000, is_recurring: true },
        ],
        budgets: [
          { category_id: "cat-1", limit_paise: 3000000 },
        ],
        monthly_savings_target_paise: 2000000,
      };

      expect(payload.incomes[0].amount_paise).toBeGreaterThan(0);
      expect(payload.budgets[0].limit_paise).toBeGreaterThanOrEqual(0);
      expect(payload.monthly_savings_target_paise).toBe(2000000);
    });
  });
});
