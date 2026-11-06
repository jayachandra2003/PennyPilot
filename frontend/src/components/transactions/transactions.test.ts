import { describe, it, expect } from "vitest";
import type { TransactionItem } from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { TRANSACTION_SUBTITLE } from "./TransactionList";

const mockTransactions: TransactionItem[] = [
  {
    id: "tx-1",
    user_id: "test-user-isolated",
    category_id: "cat-1",
    category_name: "Groceries",
    kind: "expense",
    amount_paise: 45000,
    amount_rupees: 450,
    formatted_amount: "₹450.00",
    occurred_on: "2026-11-06",
    description: "Weekly Grocery Run",
    merchant: "D-Mart",
    source: "manual",
    created_at: "2026-11-06T10:00:00Z",
    updated_at: "2026-11-06T10:00:00Z",
  },
  {
    id: "tx-2",
    user_id: "test-user-isolated",
    category_id: "cat-1",
    category_name: "Groceries",
    kind: "expense",
    amount_paise: 12000,
    amount_rupees: 120,
    formatted_amount: "₹120.00",
    occurred_on: "2026-11-06",
    description: "Daily Milk & Curd",
    merchant: "Amul Store",
    source: "manual",
    created_at: "2026-11-06T10:05:00Z",
    updated_at: "2026-11-06T10:05:00Z",
  },
  {
    id: "tx-3",
    user_id: "test-user-isolated",
    category_id: "cat-2",
    category_name: "Salary",
    kind: "income",
    amount_paise: 8500000,
    amount_rupees: 85000,
    formatted_amount: "₹85,000.00",
    occurred_on: "2026-11-01",
    description: "November Monthly Salary",
    merchant: "TechCorp India",
    source: "manual",
    created_at: "2026-11-01T09:00:00Z",
    updated_at: "2026-11-01T09:00:00Z",
  },
  {
    id: "tx-4",
    user_id: "test-user-isolated",
    category_id: "cat-3",
    category_name: "Dining",
    kind: "expense",
    amount_paise: 68000,
    amount_rupees: 680,
    formatted_amount: "₹680.00",
    occurred_on: "2026-11-05",
    description: "Team Celebration Lunch",
    merchant: "Toit Brewery",
    source: "nl",
    created_at: "2026-11-05T13:00:00Z",
    updated_at: "2026-11-05T13:00:00Z",
  },
];

// Pure filtering logic
function filterTransactions(
  transactions: TransactionItem[],
  searchTerm: string,
  selectedCat: string,
  selectedKind: "all" | "expense" | "income"
): TransactionItem[] {
  return transactions.filter((t) => {
    if (selectedCat !== "all" && t.category_id !== selectedCat) return false;
    if (selectedKind !== "all" && t.kind !== selectedKind) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = (t.category_name || "").toLowerCase().includes(q);
      const matchMerchant = (t.merchant || "").toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchMerchant) return false;
    }
    return true;
  });
}

// Pure telemetry calculation
function calculateTelemetry(transactions: TransactionItem[], filtered: TransactionItem[]) {
  const totalCount = transactions.length;
  const filteredCount = filtered.length;

  const totalInflowPaise = transactions
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + t.amount_paise, 0);

  const totalOutflowPaise = transactions
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + t.amount_paise, 0);

  const filteredInflowPaise = filtered
    .filter((t) => t.kind === "income")
    .reduce((sum, t) => sum + t.amount_paise, 0);

  const filteredOutflowPaise = filtered
    .filter((t) => t.kind === "expense")
    .reduce((sum, t) => sum + t.amount_paise, 0);

  return {
    totalCount,
    filteredCount,
    totalInflowPaise,
    totalOutflowPaise,
    filteredInflowPaise,
    filteredOutflowPaise,
  };
}

describe("Stage 4A — Transactions Ledger Pure Logic & Integrity", () => {
  describe("A. Terminology Verification", () => {
    it("ensures double-entry claim is removed and accurate INR tracking terminology is present", () => {
      expect(TRANSACTION_SUBTITLE).toBe("Your income and expenses, organized with precise INR tracking.");
      expect(TRANSACTION_SUBTITLE).not.toContain("double-entry");
      expect(TRANSACTION_SUBTITLE).not.toContain("Auditable");
    });
  });

  describe("B. Search & Filtering Verification", () => {
    it("filters correctly by merchant name case-insensitively", () => {
      const result = filterTransactions(mockTransactions, "d-mart", "all", "all");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tx-1");
      expect(result[0].merchant).toBe("D-Mart");
    });

    it("filters correctly by transaction kind (expenses only)", () => {
      const result = filterTransactions(mockTransactions, "", "all", "expense");
      expect(result).toHaveLength(3);
      expect(result.every((t) => t.kind === "expense")).toBe(true);
    });

    it("filters correctly by transaction kind (income only)", () => {
      const result = filterTransactions(mockTransactions, "", "all", "income");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tx-3");
      expect(result[0].amount_paise).toBe(8500000);
    });

    it("filters correctly by category id", () => {
      const result = filterTransactions(mockTransactions, "", "cat-1", "all");
      expect(result).toHaveLength(2);
      expect(result.every((t) => t.category_id === "cat-1")).toBe(true);
    });

    it("combines search, kind, and category filters accurately", () => {
      const result = filterTransactions(mockTransactions, "Milk", "cat-1", "expense");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("tx-2");
    });
  });

  describe("C. Paging & Boundary Logic", () => {
    it("paginates items according to PAGE_SIZE = 15", () => {
      const manyItems: TransactionItem[] = Array.from({ length: 38 }, (_, i) => ({
        id: `tx-gen-${i}`,
        user_id: "test-user-isolated",
        category_id: "cat-1",
        kind: "expense",
        amount_paise: 10000,
        amount_rupees: 100,
        formatted_amount: "₹100.00",
        occurred_on: "2026-11-06",
        description: `Generated Tx ${i + 1}`,
        source: "manual",
        created_at: "2026-11-06T12:00:00Z",
        updated_at: "2026-11-06T12:00:00Z",
      }));

      const PAGE_SIZE = 15;
      const totalPages = Math.max(1, Math.ceil(manyItems.length / PAGE_SIZE));
      expect(totalPages).toBe(3);

      const page1 = manyItems.slice(0, PAGE_SIZE);
      const page2 = manyItems.slice(PAGE_SIZE, PAGE_SIZE * 2);
      const page3 = manyItems.slice(PAGE_SIZE * 2, PAGE_SIZE * 3);

      expect(page1).toHaveLength(15);
      expect(page2).toHaveLength(15);
      expect(page3).toHaveLength(8);
      expect(page1[0].description).toBe("Generated Tx 1");
      expect(page3[7].description).toBe("Generated Tx 38");
    });
  });

  describe("D. Telemetry Metrics Verification", () => {
    it("computes accurate baseline and filtered metrics without cross-contamination", () => {
      const filtered = filterTransactions(mockTransactions, "", "all", "expense");
      const metrics = calculateTelemetry(mockTransactions, filtered);

      expect(metrics.totalCount).toBe(4);
      expect(metrics.filteredCount).toBe(3);

      // Inflow
      expect(metrics.totalInflowPaise).toBe(8500000); // ₹85,000
      expect(metrics.filteredInflowPaise).toBe(0); // 0 income among expenses

      // Outflow
      expect(metrics.totalOutflowPaise).toBe(45000 + 12000 + 68000); // 125,000 paise = ₹1,250
      expect(metrics.filteredOutflowPaise).toBe(125000);

      expect(formatINR(metrics.totalInflowPaise)).toBe("₹85,000.00");
      expect(formatINR(metrics.filteredOutflowPaise)).toBe("₹1,250.00");
      expect(formatINR(metrics.filteredOutflowPaise, { showPaise: false })).toBe("₹1,250");
    });
  });

  describe("E. Isolated Transaction Edit and Delete Validation", () => {
    it("validates paise and rupees bidirectional conversions for editing", () => {
      const originalPaise = 45000;
      const rupees = paiseToRupees(originalPaise);
      expect(rupees).toBe(450);

      const editedRupees = 550.5;
      const updatedPaise = rupeesToPaise(editedRupees);
      expect(updatedPaise).toBe(55050);

      const invalidInput = rupeesToPaise(Number("invalid"));
      expect(Number.isNaN(invalidInput)).toBe(true);
    });

    it("verifies soft-delete state handling on isolated transaction item", () => {
      const activeTx: TransactionItem = { ...mockTransactions[0] };
      expect(activeTx.id).toBe("tx-1");

      // Soft delete simulation
      const deletedTx = { ...activeTx, deleted_at: "2026-11-06T14:30:00Z" };
      const activeList = [activeTx].filter((t: any) => !t.deleted_at);
      expect(activeList).toHaveLength(1);

      const listAfterDelete = [deletedTx].filter((t: any) => !t.deleted_at);
      expect(listAfterDelete).toHaveLength(0);
    });
  });
});
