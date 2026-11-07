import { describe, it, expect } from "vitest";
import { formatINR, paiseToRupees, rupeesToPaise } from "./currency";

describe("Frontend Currency Formatter (INR)", () => {
  it("formats paise to standard Indian grouped rupees with symbol", () => {
    expect(formatINR(50000)).toBe("₹500.00");
    expect(formatINR(12045)).toBe("₹120.45");
    expect(formatINR(123456789)).toBe("₹12,34,567.89");
    expect(formatINR(10000000)).toBe("₹1,00,000.00");
  });

  it("handles negative amounts and zero", () => {
    expect(formatINR(0)).toBe("₹0.00");
    expect(formatINR(-150000)).toBe("-₹1,500.00");
    expect(formatINR(-50000, { includeSymbol: false })).toBe("-500.00");
  });

  it("correctly converts between rupees and paise", () => {
    expect(rupeesToPaise(120.5)).toBe(12050);
    expect(paiseToRupees(12050)).toBe(120.5);
  });
});
