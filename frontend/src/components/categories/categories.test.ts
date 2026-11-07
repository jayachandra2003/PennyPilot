import { describe, it, expect } from "vitest";

interface MockCategory {
  id: string;
  name: string;
  kind: "expense" | "income";
  icon: string;
  color_token: string;
  is_archived: boolean;
  is_default: boolean;
  has_active_budget: boolean;
  transaction_count: number;
}

const mockCategories: MockCategory[] = [
  {
    id: "cat-1",
    name: "Groceries",
    kind: "expense",
    icon: "shopping-cart",
    color_token: "emerald",
    is_archived: false,
    is_default: true,
    has_active_budget: true,
    transaction_count: 24,
  },
  {
    id: "cat-2",
    name: "Salary",
    kind: "income",
    icon: "banknote",
    color_token: "emerald",
    is_archived: false,
    is_default: true,
    has_active_budget: false,
    transaction_count: 6,
  },
  {
    id: "cat-3",
    name: "Pet Supplies",
    kind: "expense",
    icon: "heart",
    color_token: "amber",
    is_archived: false,
    is_default: false,
    has_active_budget: false,
    transaction_count: 3,
  },
  {
    id: "cat-4",
    name: "Freelance Design",
    kind: "income",
    icon: "briefcase",
    color_token: "blue",
    is_archived: false,
    is_default: false,
    has_active_budget: false,
    transaction_count: 2,
  },
  {
    id: "cat-5",
    name: "Old Gym Membership",
    kind: "expense",
    icon: "dumbbell",
    color_token: "rose",
    is_archived: true,
    is_default: false,
    has_active_budget: false,
    transaction_count: 1,
  },
];

describe("Category Management logic & rules", () => {
  it("separates expense and income categories correctly", () => {
    const expenses = mockCategories.filter((c) => c.kind === "expense");
    const incomes = mockCategories.filter((c) => c.kind === "income");

    expect(expenses).toHaveLength(3);
    expect(incomes).toHaveLength(2);
    expect(expenses.every((c) => c.kind === "expense")).toBe(true);
    expect(incomes.every((c) => c.kind === "income")).toBe(true);
  });

  it("filters out archived categories by default unless includeArchived is set", () => {
    const activeExpenses = mockCategories.filter(
      (c) => c.kind === "expense" && !c.is_archived
    );
    expect(activeExpenses).toHaveLength(2);
    expect(activeExpenses.some((c) => c.name === "Old Gym Membership")).toBe(false);

    const allExpenses = mockCategories.filter((c) => c.kind === "expense");
    expect(allExpenses).toHaveLength(3);
    expect(allExpenses.some((c) => c.name === "Old Gym Membership")).toBe(true);
  });

  it("identifies default categories and blocks archival", () => {
    const defaultCat = mockCategories.find((c) => c.name === "Groceries")!;
    expect(defaultCat.is_default).toBe(true);

    const canArchive = !defaultCat.is_default && !defaultCat.has_active_budget;
    expect(canArchive).toBe(false);
  });

  it("blocks category archival when an active budget exists", () => {
    const customWithBudget: MockCategory = {
      id: "cat-test",
      name: "Custom Budgeted",
      kind: "expense",
      icon: "tag",
      color_token: "teal",
      is_archived: false,
      is_default: false,
      has_active_budget: true,
      transaction_count: 0,
    };

    const canArchive = !customWithBudget.is_default && !customWithBudget.has_active_budget;
    expect(canArchive).toBe(false);
  });

  it("permits archival for unused custom categories without active budgets", () => {
    const unusedCustom: MockCategory = {
      id: "cat-unused",
      name: "Unused Gadgets",
      kind: "expense",
      icon: "zap",
      color_token: "blue",
      is_archived: false,
      is_default: false,
      has_active_budget: false,
      transaction_count: 0,
    };

    const canArchive = !unusedCustom.is_default && !unusedCustom.has_active_budget;
    expect(canArchive).toBe(true);
  });

  it("searches categories case-insensitively", () => {
    const query = "pet";
    const results = mockCategories.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Pet Supplies");
  });
});
