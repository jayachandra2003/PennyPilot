import { describe, it, expect } from "vitest";
import {
  buildCSVContent,
  buildDOCXHtml,
  exportTransactionsCSV,
  exportTransactionsPDF,
  exportTransactionsDOCX,
  buildAnalyticsCSV,
  buildAnalyticsDOCXHtml,
  exportAnalyticsCSV,
  exportAnalyticsPDF,
  exportAnalyticsDOCX,
  buildMonthlyStatementCSV,
  exportMonthlyStatementCSV,
  exportMonthlyStatementPDF,
  exportMonthlyStatementDOCX,
  sanitizeCurrencyForDoc,
  formatDocINR,
} from "./exportReports";
import type { TransactionItem, HistoricalAnalyticsResponse, MonthlyReportResponse } from "./api";

const mockTransactions: TransactionItem[] = [
  {
    id: "tx-1",
    user_id: "user-1",
    category_id: "cat-1",
    category_name: "Primary Salary",
    kind: "income",
    amount_paise: 7500000,
    amount_rupees: 75000,
    formatted_amount: "₹75,000.00",
    occurred_on: "2026-11-01",
    description: "Monthly Salary Deposit",
    merchant: "Acme Corp",
    source: "manual",
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
  },
  {
    id: "tx-2",
    user_id: "user-1",
    category_id: "cat-2",
    category_name: "Utilities & Bills",
    kind: "expense",
    amount_paise: 250000,
    amount_rupees: 2500,
    formatted_amount: "₹2,500.00",
    occurred_on: "2026-11-07",
    description: "High speed fiber",
    merchant: "Wifi bill",
    source: "nl",
    created_at: "2026-11-07T12:00:00Z",
    updated_at: "2026-11-07T12:00:00Z",
  },
];

const mockAnalytics: HistoricalAnalyticsResponse = {
  months: [
    {
      year: 2026,
      month: 11,
      month_name: "November 2026",
      month_short: "Nov",
      first_day: "2026-11-01",
      last_day: "2026-11-30",
      total_days: 30,
      transaction_count: 8,
      is_empty: false,
      income_paise: 7500000,
      income_formatted: "₹75,000.00",
      expense_paise: 518000,
      expense_formatted: "₹5,180.00",
      net_balance_paise: 6982000,
      net_balance_formatted: "₹69,820.00",
      savings_rate_percent: 93.1,
      category_breakdown: [
        {
          category_id: "c-1",
          category_name: "Utilities",
          total_paise: 250000,
          total_rupees: 2500,
          formatted_total: "₹2,500.00",
          percentage: 48.3,
          transaction_count: 1,
        },
      ],
      expense_mom_delta_paise: 0,
      expense_mom_delta_formatted: "₹0.00",
      expense_mom_pct: 0,
    },
  ],
  overall: {
    total_income_paise: 7500000,
    total_income_formatted: "₹75,000.00",
    total_expense_paise: 518000,
    total_expense_formatted: "₹5,180.00",
    total_net_savings_paise: 6982000,
    total_net_savings_formatted: "₹69,820.00",
    average_monthly_income_paise: 7500000,
    average_monthly_income_formatted: "₹75,000.00",
    average_monthly_expense_paise: 518000,
    average_monthly_expense_formatted: "₹5,180.00",
    average_monthly_savings_paise: 6982000,
    average_monthly_savings_formatted: "₹69,820.00",
    overall_savings_rate_percent: 93.1,
    months_count: 1,
    active_months_count: 1,
    top_categories: [
      {
        category_id: "c-1",
        category_name: "Utilities",
        total_paise: 250000,
        total_rupees: 2500,
        formatted_total: "₹2,500.00",
        percentage: 48.3,
        transaction_count: 1,
      },
    ],
  },
};

describe("Deterministic Financial Reports Exporter", () => {
  it("builds valid CSV content with correct headers and integer paise converted to Rupees", () => {
    const csv = buildCSVContent(mockTransactions);
    expect(csv).toContain("Date,Description,Merchant,Category,Type,Amount (INR),Source");
    expect(csv).toContain("Acme Corp");
    expect(csv).toContain("75000");
    expect(csv).toContain("2500");
  });

  it("builds valid Word-compliant HTML for DOCX export", () => {
    const html = buildDOCXHtml(mockTransactions);
    expect(html).toContain("PennyPilot");
    expect(html).toContain("Financial Ledger Statement & Audit Report");
    expect(html).toContain("75,000.00");
    expect(html).toContain("schemas-microsoft-com:office:word");
  });

  it("builds valid Historical Analytics CSV with monthly breakdown", () => {
    const csv = buildAnalyticsCSV(mockAnalytics);
    expect(csv).toContain("Month,Year,Income (INR),Expense (INR),Net Balance (INR),Savings Rate (%)");
    expect(csv).toContain("November 2026");
    expect(csv).toContain("75000");
    expect(csv).toContain("5180");
  });

  it("builds valid Historical Analytics DOCX HTML with macro metrics", () => {
    const html = buildAnalyticsDOCXHtml(mockAnalytics);
    expect(html).toContain("PennyPilot");
    expect(html).toContain("Historical Financial Analytics Statement");
    expect(html).toContain("75,000.00");
    expect(html).toContain("5,180.00");
    expect(html).toContain("69,820.00");
  });

  it("safely handles export calls in non-browser environment without throwing", () => {
    expect(() => exportTransactionsCSV(mockTransactions)).not.toThrow();
    expect(() => exportTransactionsPDF(mockTransactions)).not.toThrow();
    expect(() => exportTransactionsDOCX(mockTransactions)).not.toThrow();
    expect(() => exportAnalyticsCSV(mockAnalytics)).not.toThrow();
    expect(() => exportAnalyticsPDF(mockAnalytics)).not.toThrow();
    expect(() => exportAnalyticsDOCX(mockAnalytics)).not.toThrow();
  });

  it("builds valid Monthly Statement CSV and runs statement exports safely", () => {
    const mockReport: MonthlyReportResponse = {
      year: 2026,
      month: 11,
      title: "Monthly Financial Report - Nov 2026",
      health_status: "Exceptional",
      executive_summary: "In 2026-11, you maintained an Exceptional financial posture with 93.1% savings rate.",
      measured_facts: {
        income: "₹75,000.00",
        expenses: "₹5,180.00",
        net_balance: "₹69,820.00",
        savings_rate: "93.1%",
        budget_limit: "₹38,000.00",
        budget_spent: "₹5,180.00",
        budget_utilization: "13.6%",
        transaction_count: 8,
        categories: [
          { category_name: "Utilities & Bills", formatted_total: "₹2,500.00", percentage: 48.3 },
          { category_name: "Shopping", formatted_total: "₹1,500.00", percentage: 29.0 },
        ],
      },
      category_shifts: ["Utilities increased by ₹2,500.00"],
      anomalies: [
        {
          date: "2026-11-07",
          description: "Wifi bill",
          amount: "₹2,500.00",
          evidence: "6.6x higher than median",
        },
      ],
      recommendations: ["Maintain current spending discipline."],
      disclaimer: "Verified personal financial statement.",
    };

    const csv = buildMonthlyStatementCSV(mockReport);
    expect(csv).toContain("PennyPilot Personal Financial Statement");
    expect(csv).toContain("2026-11");
    expect(csv).toContain("₹75,000.00");
    expect(csv).toContain("Utilities & Bills");
    expect(csv).toContain("Wifi bill");

    expect(() => exportMonthlyStatementCSV(mockReport)).not.toThrow();
    expect(() => exportMonthlyStatementPDF(mockReport)).not.toThrow();
    expect(() => exportMonthlyStatementDOCX(mockReport)).not.toThrow();
  });

  it("sanitizes currency symbols for standard PDF/DOCX fonts to avoid 0xB9 superscript ¹ glitches", () => {
    expect(sanitizeCurrencyForDoc("₹81,000.00")).toBe("Rs. 81,000.00");
    expect(sanitizeCurrencyForDoc("-₹8,824.00")).toBe("-Rs. 8,824.00");
    expect(sanitizeCurrencyForDoc("+₹72,175.00")).toBe("+Rs. 72,175.00");
    expect(sanitizeCurrencyForDoc("₹38,000.00")).toBe("Rs. 38,000.00");
    expect(sanitizeCurrencyForDoc(null)).toBe("Rs. 0.00");

    expect(formatDocINR(8100000)).toBe("Rs. 81,000.00");
    expect(formatDocINR(-882400)).toBe("-Rs. 8,824.00");
    expect(formatDocINR(0)).toBe("Rs. 0.00");

    // Ensure no Unicode rupee glyphs remain
    expect(sanitizeCurrencyForDoc("₹81,000.00")).not.toContain("₹");
    expect(formatDocINR(8100000)).not.toContain("₹");
  });
});
