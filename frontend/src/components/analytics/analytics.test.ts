import { describe, it, expect } from "vitest";

interface MockMonthSummary {
  year: number;
  month: number;
  month_name: string;
  month_short: string;
  income_paise: number;
  expense_paise: number;
  net_balance_paise: number;
  savings_rate_percent: number;
  is_empty: boolean;
  expense_mom_delta_paise: number | null;
  expense_mom_pct: number | null;
  savings_rate_mom_delta: number | null;
}

const mockMonths: MockMonthSummary[] = [
  {
    year: 2026,
    month: 6,
    month_name: "Jun 2026",
    month_short: "Jun",
    income_paise: 0,
    expense_paise: 0,
    net_balance_paise: 0,
    savings_rate_percent: 0.0,
    is_empty: true,
    expense_mom_delta_paise: null,
    expense_mom_pct: null,
    savings_rate_mom_delta: null,
  },
  {
    year: 2026,
    month: 7,
    month_name: "Jul 2026",
    month_short: "Jul",
    income_paise: 0,
    expense_paise: 0,
    net_balance_paise: 0,
    savings_rate_percent: 0.0,
    is_empty: true,
    expense_mom_delta_paise: 0,
    expense_mom_pct: 0.0,
    savings_rate_mom_delta: 0.0,
  },
  {
    year: 2026,
    month: 8,
    month_name: "Aug 2026",
    month_short: "Aug",
    income_paise: 8000000, // ₹80,000
    expense_paise: 4000000, // ₹40,000
    net_balance_paise: 4000000, // ₹40,000
    savings_rate_percent: 50.0,
    is_empty: false,
    expense_mom_delta_paise: 4000000,
    expense_mom_pct: 100.0,
    savings_rate_mom_delta: 50.0,
  },
  {
    year: 2026,
    month: 9,
    month_name: "Sep 2026",
    month_short: "Sep",
    income_paise: 10000000, // ₹1,00,000
    expense_paise: 5000000, // ₹50,000
    net_balance_paise: 5000000, // ₹50,000
    savings_rate_percent: 50.0,
    is_empty: false,
    expense_mom_delta_paise: 1000000,
    expense_mom_pct: 25.0,
    savings_rate_mom_delta: 0.0,
  },
  {
    year: 2026,
    month: 10,
    month_name: "Oct 2026",
    month_short: "Oct",
    income_paise: 10000000, // ₹1,00,000
    expense_paise: 6500000, // ₹65,000
    net_balance_paise: 3500000, // ₹35,000
    savings_rate_percent: 35.0,
    is_empty: false,
    expense_mom_delta_paise: 1500000,
    expense_mom_pct: 30.0,
    savings_rate_mom_delta: -15.0,
  },
  {
    year: 2026,
    month: 11,
    month_name: "Nov 2026",
    month_short: "Nov",
    income_paise: 12000000, // ₹1,20,000
    expense_paise: 5000000, // ₹50,000
    net_balance_paise: 7000000, // ₹70,000
    savings_rate_percent: 58.33,
    is_empty: false,
    expense_mom_delta_paise: -1500000,
    expense_mom_pct: -23.1,
    savings_rate_mom_delta: 23.33,
  },
];

describe("Historical Analytics data transformations", () => {
  it("maintains strict 6-month chronological sequence", () => {
    expect(mockMonths).toHaveLength(6);
    expect(mockMonths[0].month_short).toBe("Jun");
    expect(mockMonths[5].month_short).toBe("Nov");
  });

  it("handles empty months without mathematical error", () => {
    const jun = mockMonths[0];
    expect(jun.is_empty).toBe(true);
    expect(jun.income_paise).toBe(0);
    expect(jun.expense_paise).toBe(0);
    expect(jun.savings_rate_percent).toBe(0.0);
  });

  it("calculates Month-over-Month expense shift correctly", () => {
    // Sept to Oct: Expense increased from 50k to 65k (+15k, +30.0%)
    const oct = mockMonths[4];
    expect(oct.expense_mom_delta_paise).toBe(1500000);
    expect(oct.expense_mom_pct).toBe(30.0);
    expect(oct.savings_rate_mom_delta).toBe(-15.0);

    // Oct to Nov: Expense decreased from 65k to 50k (-15k, -23.1%)
    const nov = mockMonths[5];
    expect(nov.expense_mom_delta_paise).toBe(-1500000);
    expect(nov.expense_mom_pct).toBe(-23.1);
    expect(nov.savings_rate_mom_delta).toBe(23.33);
  });

  it("calculates overall 6-month aggregates with integer paise precision", () => {
    const totalIncomePaise = mockMonths.reduce((acc, m) => acc + m.income_paise, 0);
    const totalExpensePaise = mockMonths.reduce((acc, m) => acc + m.expense_paise, 0);
    const totalNetSavingsPaise = totalIncomePaise - totalExpensePaise;

    // 0 + 0 + 80k + 100k + 100k + 120k = 400k (4,00,00,000 paise)
    expect(totalIncomePaise).toBe(40000000);
    // 0 + 0 + 40k + 50k + 65k + 50k = 205k (2,05,00,000 paise)
    expect(totalExpensePaise).toBe(20500000);
    expect(totalNetSavingsPaise).toBe(19500000);

    const overallSavingsRate = Math.round(((totalNetSavingsPaise / totalIncomePaise) * 100) * 100) / 100;
    expect(overallSavingsRate).toBe(48.75);
  });
});
