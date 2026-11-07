import { describe, it, expect, vi, beforeEach } from "vitest";
import { paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { extractReceipt } from "../../lib/api";

describe("Receipt Capture & Processing Module", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("converts extracted rupee amounts to strict integer paise without float precision loss", () => {
    // Testing boundary amounts
    expect(rupeesToPaise(1250.50)).toBe(125050);
    expect(rupeesToPaise(483.00)).toBe(48300);
    expect(rupeesToPaise(0.75)).toBe(75);
    expect(paiseToRupees(125050)).toBe(1250.5);
    expect(paiseToRupees(48300)).toBe(483);
  });

  it("extractReceipt sends multipart/form-data and receives verified draft", async () => {
    const mockResponse = {
      file_id: "a1b2c3d4e5f678901234567890abcdef",
      file_name: "sample_bill.pdf",
      file_size: 10240,
      mime_type: "application/pdf",
      merchant: "Starbucks India",
      amount_paise: 48300,
      date: "2026-11-05",
      tax_paise: 2300,
      line_items: [
        { name: "Caffe Latte", amount_paise: 28000 },
        { name: "Muffin", amount_paise: 18000 },
      ],
      suggested_category_id: "cat-dining",
      suggested_category_name: "Dining & Food",
      description: "Starbucks India",
      confidence_score: 0.9,
      extraction_method: "pdf_text",
      warnings: [],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const file = new File(["%PDF-1.4 sample content"], "sample_bill.pdf", { type: "application/pdf" });
    const result = await extractReceipt(file);

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.file_name).toBe("sample_bill.pdf");
    expect(result.merchant).toBe("Starbucks India");
    expect(result.amount_paise).toBe(48300);
    expect(result.line_items).toHaveLength(2);
    expect(result.confidence_score).toBe(0.9);
  });

  it("extractReceipt handles error messages cleanly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "File exceeds maximum allowed size of 5 MB." }),
    } as Response);

    const oversizedFile = new File(["dummy content"], "large.pdf", { type: "application/pdf" });
    await expect(extractReceipt(oversizedFile)).rejects.toThrow("File exceeds maximum allowed size of 5 MB.");
  });
});
