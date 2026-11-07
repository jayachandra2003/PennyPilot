/**
 * PennyPilot — Deterministic Financial Export Engine
 * Supports: CSV (Spreadsheet), PDF (Printable Statement), and DOCX (Word Document)
 * Covers: Financial Ledger Transactions & Historical Financial Analytics
 * Adheres strictly to the Prime Directives:
 * - Deterministic integer paise arithmetic via formatINR / paiseToRupees
 * - Zero hallucination, strict local generation
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  TransactionItem,
  HistoricalAnalyticsResponse,
  MonthlyReportResponse,
  BudgetPace,
  AnomalyItem,
  MonthlySummary,
} from "./api";
import { formatINR, paiseToRupees } from "./currency";

// ============================================================================
// 1. TRANSACTION LEDGER EXPORTS
// ============================================================================

/**
 * 1a. Build Transaction CSV Content (Pure Deterministic Function)
 */
export function buildCSVContent(transactions: TransactionItem[]): string {
  if (transactions.length === 0) return "";

  const headers = ["Date", "Description", "Merchant", "Category", "Type", "Amount (INR)", "Source"];
  const rows = transactions.map((t) => [
    t.occurred_on,
    `"${(t.description || "").replace(/"/g, '""')}"`,
    `"${(t.merchant || "").replace(/"/g, '""')}"`,
    `"${(t.category_name || "General").replace(/"/g, '""')}"`,
    t.kind,
    paiseToRupees(t.amount_paise),
    t.source,
  ]);

  return "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
}

/**
 * 1b. Export Transactions as CSV
 */
export function exportTransactionsCSV(
  transactions: TransactionItem[],
  filenamePrefix = "pennypilot_ledger"
): void {
  if (transactions.length === 0 || typeof document === "undefined") return;

  const csv = buildCSVContent(transactions);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTransactionsPDF(
  transactions: TransactionItem[],
  filenamePrefix = "pennypilot_report"
): void {
  if (transactions.length === 0 || typeof document === "undefined") return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const dateStamp = new Date().toISOString().split("T")[0];
  const nowFormatted = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Calculate totals deterministically in paise
  let totalInflowPaise = 0;
  let totalOutflowPaise = 0;
  for (const t of transactions) {
    if (t.kind === "income") totalInflowPaise += t.amount_paise;
    else totalOutflowPaise += t.amount_paise;
  }
  const netPaise = totalInflowPaise - totalOutflowPaise;

  // Primary Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110); // Deep Teal #0F766E
  doc.text("PENNYPILOT", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("Deterministic Financial Ledger & Statement Report", 14, 24);

  doc.setFontSize(8);
  doc.text(`Generated on: ${nowFormatted} | Entries: ${transactions.length}`, 14, 29);

  // Decorative hairline rule
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 32, 196, 32);

  // Summary Telemetry Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 35, 182, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL INFLOW", 20, 41);
  doc.text("TOTAL OUTFLOW", 82, 41);
  doc.text("NET CASH FLOW", 144, 41);

  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`+${formatINR(totalInflowPaise)}`, 20, 48);

  doc.setTextColor(225, 29, 72);
  doc.text(`-${formatINR(totalOutflowPaise)}`, 82, 48);

  doc.setTextColor(netPaise >= 0 ? 15 : 225, netPaise >= 0 ? 118 : 29, netPaise >= 0 ? 110 : 72);
  doc.text(`${netPaise >= 0 ? "+" : ""}${formatINR(netPaise)}`, 144, 48);

  // Build Transaction Table Rows
  const tableData = transactions.map((t) => {
    const isExpense = t.kind === "expense";
    const amountStr = isExpense ? `-${formatINR(t.amount_paise)}` : `+${formatINR(t.amount_paise)}`;
    return [
      t.occurred_on,
      t.merchant ? `${t.merchant}\n${t.description}` : t.description,
      t.category_name || "General",
      t.kind.toUpperCase(),
      amountStr,
    ];
  });

  autoTable(doc, {
    startY: 57,
    head: [["Date", "Description / Merchant", "Category", "Type", "Amount (INR)"]],
    body: tableData,
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      font: "helvetica",
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 32 },
      3: { cellWidth: 20 },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text.startsWith("+")) {
          data.cell.styles.textColor = [5, 150, 105];
        } else {
          data.cell.styles.textColor = [15, 23, 42];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 20 },
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "PennyPilot Certified Financial Statement • All arithmetic computed deterministically in integer paise.",
      14,
      290
    );
    doc.text(`Page ${i} of ${pageCount}`, 180, 290, { align: "right" });
  }

  doc.save(`${filenamePrefix}_${dateStamp}.pdf`);
}

/**
 * 1d. Build Transaction DOCX Compatible HTML (Pure Deterministic Function)
 */
export function buildDOCXHtml(transactions: TransactionItem[]): string {
  if (transactions.length === 0) return "";

  const nowFormatted = new Date().toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  });

  let totalInflowPaise = 0;
  let totalOutflowPaise = 0;
  for (const t of transactions) {
    if (t.kind === "income") totalInflowPaise += t.amount_paise;
    else totalOutflowPaise += t.amount_paise;
  }
  const netPaise = totalInflowPaise - totalOutflowPaise;

  const tableRowsHtml = transactions
    .map((t, idx) => {
      const isExpense = t.kind === "expense";
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const amountColor = isExpense ? "#0f172a" : "#059669";
      const amountSign = isExpense ? "-" : "+";
      return `
      <tr style="background-color: ${bg};">
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; white-space: nowrap;">${t.occurred_on}</td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px;">
          <strong>${t.merchant || t.description}</strong>
          ${t.merchant && t.description && t.merchant !== t.description ? `<br/><span style="color: #64748b; font-size: 10px;">${t.description}</span>` : ""}
        </td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${t.category_name || "General"}</td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-transform: uppercase;">${t.kind}</td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold; color: ${amountColor};">
          ${amountSign}${formatINR(t.amount_paise)}
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>PennyPilot Financial Statement</title>
  <style>
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #0f172a; line-height: 1.4; margin: 24px; }
    h1 { color: #0f766e; font-size: 24px; margin: 0 0 4px 0; }
    .subtitle { color: #64748b; font-size: 12px; margin: 0 0 16px 0; }
    .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #f8fafc; border: 1px solid #cbd5e1; }
    .kpi-cell { padding: 12px 16px; border: 1px solid #e2e8f0; width: 33.33%; }
    .kpi-label { font-size: 10px; text-transform: uppercase; color: #475569; font-weight: bold; }
    .kpi-val { font-size: 16px; font-weight: bold; margin-top: 4px; }
    .ledger-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .ledger-table th { background-color: #0f766e; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 11px; border: 1px solid #0f766e; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>PennyPilot</h1>
  <div class="subtitle">
    Financial Ledger Statement & Audit Report • Generated: ${nowFormatted} • Total Transactions: ${transactions.length}
  </div>

  <table class="kpi-table">
    <tr>
      <td class="kpi-cell">
        <div class="kpi-label">Total Verified Inflow</div>
        <div class="kpi-val" style="color: #059669;">+${formatINR(totalInflowPaise)}</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-label">Total Outflows Recorded</div>
        <div class="kpi-val" style="color: #e11d48;">-${formatINR(totalOutflowPaise)}</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-label">Net Surplus / Cash Flow</div>
        <div class="kpi-val" style="color: ${netPaise >= 0 ? "#0f766e" : "#e11d48"};">
          ${netPaise >= 0 ? "+" : ""}${formatINR(netPaise)}
        </div>
      </td>
    </tr>
  </table>

  <h3 style="font-size: 14px; margin-bottom: 6px; color: #1e293b;">Verified Transaction Ledger</h3>
  <table class="ledger-table">
    <thead>
      <tr>
        <th style="width: 15%;">Date</th>
        <th style="width: 40%;">Description / Merchant</th>
        <th style="width: 20%;">Category</th>
        <th style="width: 10%;">Type</th>
        <th style="width: 15%; text-align: right;">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="footer">
    PennyPilot Certified Financial Intelligence • Zero Financial Hallucination • Computed in Integer Paise
  </div>
</body>
</html>`;
}

/**
 * 1e. Export Transactions as DOCX
 */
export function exportTransactionsDOCX(
  transactions: TransactionItem[],
  filenamePrefix = "pennypilot_ledger_report"
): void {
  if (transactions.length === 0 || typeof document === "undefined") return;

  const dateStamp = new Date().toISOString().split("T")[0];
  const docHtml = buildDOCXHtml(transactions);
  const blob = new Blob([docHtml], { type: "application/vnd.ms-word;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}_${dateStamp}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 2. HISTORICAL FINANCIAL ANALYTICS EXPORTS
// ============================================================================

/**
 * 2a. Build Historical Analytics CSV
 */
export function buildAnalyticsCSV(data: HistoricalAnalyticsResponse): string {
  if (!data || !data.months || data.months.length === 0) return "";

  const headers = [
    "Month",
    "Year",
    "Income (INR)",
    "Expense (INR)",
    "Net Balance (INR)",
    "Savings Rate (%)",
    "MoM Expense Shift (%)",
    "Transactions Count",
  ];

  const rows: (string | number)[][] = data.months.map((m) => [
    m.month_name,
    m.year,
    paiseToRupees(m.income_paise),
    paiseToRupees(m.expense_paise),
    paiseToRupees(m.net_balance_paise),
    `${m.savings_rate_percent}%`,
    m.expense_mom_pct != null ? `${m.expense_mom_pct}%` : "—",
    m.transaction_count,
  ]);

  if (data.overall) {
    rows.push([]);
    rows.push([
      "OVERALL RETROSPECTIVE",
      `(${data.overall.months_count} Months)`,
      paiseToRupees(data.overall.total_income_paise),
      paiseToRupees(data.overall.total_expense_paise),
      paiseToRupees(data.overall.total_net_savings_paise),
      `${data.overall.overall_savings_rate_percent}%`,
      "—",
      "",
    ]);
  }

  return "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
}

/**
 * 2b. Export Historical Analytics as CSV
 */
export function exportAnalyticsCSV(
  data: HistoricalAnalyticsResponse,
  filenamePrefix = "pennypilot_analytics"
): void {
  if (!data || typeof document === "undefined") return;

  const csv = buildAnalyticsCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAnalyticsPDF(
  data: HistoricalAnalyticsResponse,
  filenamePrefix = "pennypilot_analytics_report"
): void {
  if (!data || typeof document === "undefined" || !data.months || data.months.length === 0) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const dateStamp = new Date().toISOString().split("T")[0];
  const nowFormatted = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const rangeStr = `${data.months[0].month_short} ${data.months[0].year} – ${data.months[data.months.length - 1].month_short} ${data.months[data.months.length - 1].year}`;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110);
  doc.text("PENNYPILOT", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Historical Financial Analytics Statement (${rangeStr})`, 14, 24);

  doc.setFontSize(8);
  doc.text(`Generated on: ${nowFormatted} | Analyzed Range: ${data.months.length} Months`, 14, 29);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 32, 196, 32);

  // Macro Metrics Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 35, 182, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL INCOME", 20, 41);
  doc.text("TOTAL EXPENSES", 76, 41);
  doc.text("NET CASH SAVINGS", 132, 41);

  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(`+${data.overall.total_income_formatted}`, 20, 48);

  doc.setTextColor(225, 29, 72);
  doc.text(`-${data.overall.total_expense_formatted}`, 76, 48);

  const netPositive = data.overall.total_net_savings_paise >= 0;
  doc.setTextColor(netPositive ? 15 : 225, netPositive ? 118 : 29, netPositive ? 110 : 72);
  doc.text(`${netPositive ? "+" : ""}${data.overall.total_net_savings_formatted}`, 132, 48);

  // Monthly Performance Table
  const tableData = data.months.map((m) => [
    m.month_name,
    m.income_formatted,
    m.expense_formatted,
    m.net_balance_formatted,
    `${m.savings_rate_percent}%`,
    m.expense_mom_pct != null ? `${m.expense_mom_pct > 0 ? "+" : ""}${m.expense_mom_pct}%` : "—",
    m.transaction_count.toString(),
  ]);

  autoTable(doc, {
    startY: 57,
    head: [["Month", "Income (INR)", "Expense (INR)", "Net Balance", "Savings Rate", "MoM Shift", "Entries"]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      font: "helvetica",
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 26, halign: "right" },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 24, halign: "center" },
      6: { cellWidth: 16, halign: "center" },
    },
    margin: { left: 14, right: 14, bottom: 20 },
  });

  // Top Categories Table if available
  if (data.overall.top_categories && data.overall.top_categories.length > 0) {
    const lastY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 160;
    if (lastY < 230) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Top Spending Categories Across Full Period", 14, lastY);

      const catRows = data.overall.top_categories.slice(0, 5).map((c) => [
        c.category_name,
        c.formatted_total,
        `${c.percentage}% of total outflows`,
      ]);

      autoTable(doc, {
        startY: lastY + 3,
        head: [["Category", "Total Outflow (INR)", "Share"]],
        body: catRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35, halign: "right", fontStyle: "bold" },
          2: { cellWidth: 45 },
        },
        margin: { left: 14, right: 14, bottom: 20 },
      });
    }
  }

  // Footer Disclaimer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "PennyPilot Certified Historical Analytics • Deterministic financial computation in integer paise.",
      14,
      290
    );
    doc.text(`Page ${i} of ${pageCount}`, 180, 290, { align: "right" });
  }

  doc.save(`${filenamePrefix}_${dateStamp}.pdf`);
}

/**
 * 2d. Build Historical Analytics Word (DOCX) HTML
 */
export function buildAnalyticsDOCXHtml(data: HistoricalAnalyticsResponse): string {
  if (!data || !data.months || data.months.length === 0) return "";

  const rangeStr = `${data.months[0].month_short} ${data.months[0].year} – ${data.months[data.months.length - 1].month_short} ${data.months[data.months.length - 1].year}`;
  const nowFormatted = new Date().toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const monthRows = data.months
    .map((m, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr style="background-color: ${bg};">
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${m.month_name}</td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #059669;">+${m.income_formatted}</td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #e11d48;">-${m.expense_formatted}</td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: bold; color: ${m.net_balance_paise >= 0 ? "#0f766e" : "#e11d48"};">
          ${m.net_balance_formatted}
        </td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${m.savings_rate_percent}%</td>
        <td style="padding: 7px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
          ${m.expense_mom_pct != null ? `${m.expense_mom_pct > 0 ? "+" : ""}${m.expense_mom_pct}%` : "—"}
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>PennyPilot Historical Analytics</title>
  <style>
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #0f172a; line-height: 1.4; margin: 24px; }
    h1 { color: #0f766e; font-size: 24px; margin: 0 0 4px 0; }
    .subtitle { color: #64748b; font-size: 12px; margin: 0 0 16px 0; }
    .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #f8fafc; border: 1px solid #cbd5e1; }
    .kpi-cell { padding: 12px 16px; border: 1px solid #e2e8f0; width: 33.33%; }
    .kpi-label { font-size: 10px; text-transform: uppercase; color: #475569; font-weight: bold; }
    .kpi-val { font-size: 16px; font-weight: bold; margin-top: 4px; }
    .ledger-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .ledger-table th { background-color: #0f766e; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 11px; border: 1px solid #0f766e; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>PennyPilot</h1>
  <div class="subtitle">
    Historical Financial Analytics Statement • Range: ${rangeStr} • Generated: ${nowFormatted}
  </div>

  <table class="kpi-table">
    <tr>
      <td class="kpi-cell">
        <div class="kpi-label">Total Verified Income</div>
        <div class="kpi-val" style="color: #059669;">+${data.overall.total_income_formatted}</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-label">Total Outflows Recorded</div>
        <div class="kpi-val" style="color: #e11d48;">-${data.overall.total_expense_formatted}</div>
      </td>
      <td class="kpi-cell">
        <div class="kpi-label">Net Accumulated Savings</div>
        <div class="kpi-val" style="color: ${data.overall.total_net_savings_paise >= 0 ? "#0f766e" : "#e11d48"};">
          ${data.overall.total_net_savings_formatted}
        </div>
      </td>
    </tr>
  </table>

  <h3 style="font-size: 14px; margin-bottom: 6px; color: #1e293b;">6-Month Financial Trend Summary</h3>
  <table class="ledger-table">
    <thead>
      <tr>
        <th>Month</th>
        <th style="text-align: right;">Income (INR)</th>
        <th style="text-align: right;">Expense (INR)</th>
        <th style="text-align: right;">Net Balance</th>
        <th style="text-align: center;">Savings Rate</th>
        <th style="text-align: center;">MoM Shift</th>
      </tr>
    </thead>
    <tbody>
      ${monthRows}
    </tbody>
  </table>

  <div class="footer">
    PennyPilot Certified Historical Financial Intelligence • Zero Financial Hallucination • Computed in Integer Paise
  </div>
</body>
</html>`;
}

/**
 * 2e. Export Historical Analytics as DOCX
 */
export function exportAnalyticsDOCX(
  data: HistoricalAnalyticsResponse,
  filenamePrefix = "pennypilot_analytics_report"
): void {
  if (!data || typeof document === "undefined") return;

  const dateStamp = new Date().toISOString().split("T")[0];
  const docHtml = buildAnalyticsDOCXHtml(data);
  const blob = new Blob([docHtml], { type: "application/vnd.ms-word;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}_${dateStamp}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 3. FINANCIAL INSIGHTS & STATISTICAL SIGNALS EXPORTS
// ============================================================================

export interface InsightsExportData {
  year: number;
  month: number;
  monthName: string;
  pace?: BudgetPace;
  anomalies?: AnomalyItem[];
  summary?: MonthlySummary;
}

/**
 * 3a. Build Insights CSV
 */
export function buildInsightsCSV(data: InsightsExportData): string {
  const headers = ["Metric", "Value", "Notes"];
  const rows: (string | number)[][] = [
    ["Report Period", `${data.monthName} ${data.year}`, "Verified ledger period"],
    ["Total Verified Inflow", data.summary ? formatINR(data.summary.income_paise) : "₹0.00", "Verified monthly income"],
    ["Total Verified Outflow", data.summary ? formatINR(data.summary.expense_paise) : "₹0.00", "Verified living expenses"],
    ["Net Capital Retained", data.summary ? formatINR(data.summary.net_balance_paise) : "₹0.00", "Net actual savings"],
    ["Actual Savings Rate", `${data.summary?.savings_rate_percent ?? 0}%`, "Benchmark baseline: 20-25%"],
    ["Budget Pacing Status", (data.pace?.status || "on_track").replace(/_/g, " "), `${data.pace?.utilization_percent ?? 0}% ceiling utilized`],
    ["Remaining Budget Buffer", data.pace ? formatINR(data.pace.remaining_paise) : "₹0.00", "Unspent allocation ceiling"],
  ];

  const anomalies = data.anomalies || [];
  if (anomalies.length > 0) {
    rows.push([]);
    rows.push(["STATISTICAL OUTLIERS (MAD ENGINE)", `${anomalies.length} Flagged`, "Median Absolute Deviation"]);
    rows.push(["Date", "Description / Merchant", "Amount (INR)", "Typical Median", "Spike Factor"]);
    anomalies.forEach((a) => {
      rows.push([
        a.date || "",
        `"${(a.description || "").replace(/"/g, '""')}"`,
        a.amount_formatted,
        a.baseline_median_formatted,
        `${a.multiple_of_median}x higher than median`,
      ]);
    });
  } else {
    rows.push([]);
    rows.push(["STATISTICAL OUTLIERS", "0 Anomalies", "No unusual spending spikes detected"]);
  }

  return "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
}

/**
 * 3b. Export Insights as CSV
 */
export function exportInsightsCSV(
  data: InsightsExportData,
  filenamePrefix = "pennypilot_insights"
): void {
  if (typeof document === "undefined") return;

  const csv = buildInsightsCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = `${data.year}_${String(data.month).padStart(2, "0")}`;
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 3c. Export Insights as PDF
 */
export function exportInsightsPDF(
  data: InsightsExportData,
  filenamePrefix = "pennypilot_insights_report"
): void {
  if (typeof document === "undefined") return;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Header Bar
  doc.setFillColor(15, 118, 110); // #0F766E
  doc.rect(0, 0, 595.28, 48, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("PennyPilot — Financial Insights Report", 40, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${data.monthName} ${data.year}`, 555, 30, { align: "right" });

  // Section 1: Overview Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Pacing & Capital Retention Telemetry", 40, 75);

  const summaryRows = [
    ["Total Verified Inflow", data.summary ? formatINR(data.summary.income_paise) : "₹0.00", "Verified income debits/credits"],
    ["Total Verified Outflow", data.summary ? formatINR(data.summary.expense_paise) : "₹0.00", "Living costs, bills & debits"],
    ["Net Capital Retained", data.summary ? formatINR(data.summary.net_balance_paise) : "₹0.00", "Net savings surplus"],
    ["Actual Savings Rate", `${data.summary?.savings_rate_percent ?? 0}%`, "Target: ≥ 25.0% baseline"],
    ["Budget Pacing Status", (data.pace?.status || "on_track").replace(/_/g, " "), `${data.pace?.utilization_percent ?? 0}% ceiling utilized`],
    ["Remaining Budget Buffer", data.pace ? formatINR(data.pace.remaining_paise) : "₹0.00", "Unspent allocation ceiling"],
  ];

  autoTable(doc, {
    startY: 85,
    head: [["Signal / Metric", "Amount / Rate", "Context & Guidance"]],
    body: summaryRows,
    theme: "striped",
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: "bold" },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 160, fontStyle: "bold" },
      1: { cellWidth: 130, halign: "right" },
      2: { cellWidth: 225 },
    },
    margin: { left: 40, right: 40 },
  });

  // Section 2: Outliers Table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 25 : 240;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Statistical Outlier & Anomaly Detections (MAD Engine)", 40, finalY);

  const anomalies = data.anomalies || [];
  if (anomalies.length > 0) {
    const outlierRows = anomalies.map((a) => [
      a.date || "",
      a.description,
      a.amount_formatted,
      a.baseline_median_formatted,
      `${a.multiple_of_median}x higher than median`,
    ]);

    autoTable(doc, {
      startY: finalY + 10,
      head: [["Date", "Transaction", "Spike Amount", "Typical Median", "Anomaly Factor"]],
      body: outlierRows,
      theme: "grid",
      headStyles: { fillColor: [244, 63, 94], textColor: 255, fontStyle: "bold" },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 175 },
        2: { cellWidth: 85, halign: "right" },
        3: { cellWidth: 85, halign: "right" },
        4: { cellWidth: 100, halign: "center" },
      },
      margin: { left: 40, right: 40 },
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("No atypical spending spikes or outliers detected for this period. Spending is disciplined.", 40, finalY + 20);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "PennyPilot Certified Financial Intelligence • Zero Financial Hallucination • Strict Integer Paise Precision",
    40,
    pageHeight - 20
  );

  const dateStamp = `${data.year}_${String(data.month).padStart(2, "0")}`;
  doc.save(`${filenamePrefix}_${dateStamp}.pdf`);
}

/**
 * 3d. Export Insights as DOCX
 */
export function exportInsightsDOCX(
  data: InsightsExportData,
  filenamePrefix = "pennypilot_insights_report"
): void {
  if (typeof document === "undefined") return;

  const anomalies = data.anomalies || [];
  const anomalyRows = anomalies.length > 0
    ? anomalies.map((a) => `
      <tr>
        <td>${a.date || ""}</td>
        <td><strong>${a.description}</strong></td>
        <td style="text-align: right; color: #e11d48; font-weight: bold;">${a.amount_formatted}</td>
        <td style="text-align: right;">${a.baseline_median_formatted}</td>
        <td style="text-align: center; color: #b45309;">${a.multiple_of_median}x median</td>
      </tr>
    `).join("")
    : `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 12px;">No atypical spending spikes detected for this period.</td></tr>`;

  const docHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>PennyPilot Financial Insights - ${data.monthName} ${data.year}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; margin: 36pt; color: #0f172a; line-height: 1.4; }
    .header-bar { border-bottom: 2pt solid #0f766e; padding-bottom: 8pt; margin-bottom: 18pt; }
    h1 { color: #0f766e; font-size: 20pt; margin: 0; }
    .subtitle { color: #64748b; font-size: 10pt; margin-top: 4pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 10pt; margin-bottom: 16pt; }
    th { background-color: #0f766e; color: #ffffff; font-size: 10pt; padding: 6pt 8pt; text-align: left; }
    td { font-size: 9.5pt; padding: 6pt 8pt; border-bottom: 1px solid #e2e8f0; }
    .footer { font-size: 8pt; color: #94a3b8; margin-top: 24pt; border-top: 1px solid #e2e8f0; padding-top: 6pt; }
  </style>
</head>
<body>
  <div class="header-bar">
    <h1>PennyPilot — Financial Insights Report</h1>
    <div class="subtitle">Reporting Period: ${data.monthName} ${data.year} • Generated: ${new Date().toLocaleDateString("en-IN")}</div>
  </div>

  <h2 style="font-size: 13pt; color: #0f766e; margin-bottom: 4pt;">Pacing & Capital Retention Telemetry</h2>
  <table>
    <thead>
      <tr><th>Metric</th><th style="text-align: right;">Amount / Ratio</th><th>Guidance</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Total Inflow</strong></td><td style="text-align: right; color: #0f766e; font-weight: bold;">${data.summary ? formatINR(data.summary.income_paise) : "₹0.00"}</td><td>Verified monthly income</td></tr>
      <tr><td><strong>Total Outflow</strong></td><td style="text-align: right; color: #e11d48; font-weight: bold;">${data.summary ? formatINR(data.summary.expense_paise) : "₹0.00"}</td><td>Living expenses and debits</td></tr>
      <tr><td><strong>Net Savings</strong></td><td style="text-align: right; font-weight: bold;">${data.summary ? formatINR(data.summary.net_balance_paise) : "₹0.00"}</td><td>Retained capital</td></tr>
      <tr><td><strong>Savings Rate</strong></td><td style="text-align: right; font-weight: bold;">${data.summary?.savings_rate_percent ?? 0}%</td><td>Target: ≥ 25.0%</td></tr>
      <tr><td><strong>Budget Pacing</strong></td><td style="text-align: right;">${(data.pace?.status || "on_track").replace(/_/g, " ")}</td><td>${data.pace?.utilization_percent ?? 0}% utilized</td></tr>
      <tr><td><strong>Remaining Buffer</strong></td><td style="text-align: right; color: #0f766e; font-weight: bold;">${data.pace ? formatINR(data.pace.remaining_paise) : "₹0.00"}</td><td>Unspent allocation cushion</td></tr>
    </tbody>
  </table>

  <h2 style="font-size: 13pt; color: #0f766e; margin-bottom: 4pt;">Statistical Outlier & Anomaly Detections (MAD Engine)</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Description</th><th style="text-align: right;">Amount</th><th style="text-align: right;">Typical Median</th><th style="text-align: center;">Factor</th></tr>
    </thead>
    <tbody>
      ${anomalyRows}
    </tbody>
  </table>

  <div class="footer">
    PennyPilot Certified Financial Intelligence • Zero Financial Hallucination • Computed in Integer Paise
  </div>
</body>
</html>`;

  const blob = new Blob([docHtml], { type: "application/vnd.ms-word;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = `${data.year}_${String(data.month).padStart(2, "0")}`;
  link.href = url;
  link.download = `${filenamePrefix}_${dateStamp}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


// ============================================================================
// 4. MONTHLY FINANCIAL STATEMENT EXPORTS
// ============================================================================

/**
 * 4a. Build Monthly Statement CSV Content
 */
export function buildMonthlyStatementCSV(report: MonthlyReportResponse): string {
  const facts = report.measured_facts || {};
  const lines: string[] = [];

  // Cover / Header
  lines.push(`"PennyPilot Personal Financial Statement"`);
  lines.push(`"Reporting Period",${report.year}-${String(report.month).padStart(2, "0")}`);
  lines.push(`"Generation Date",${new Date().toISOString().split("T")[0]}`);
  lines.push(`"Health Status",${report.health_status}`);
  lines.push("");

  // 1. Executive Summary
  lines.push(`"1. EXECUTIVE SUMMARY"`);
  lines.push(`"Metric","Value"`);
  lines.push(`"Total Inflow",${facts.income || "₹0.00"}`);
  lines.push(`"Total Outflow",${facts.expenses || "₹0.00"}`);
  lines.push(`"Net Capital Retained",${facts.net_balance || "₹0.00"}`);
  lines.push(`"Savings Rate",${facts.savings_rate || "0%"}`);
  lines.push(`"Budget Limit",${facts.budget_limit || "₹0.00"}`);
  lines.push(`"Budget Spent",${facts.budget_spent || "₹0.00"}`);
  lines.push(`"Budget Utilization",${facts.budget_utilization || "0%"}`);
  lines.push(`"Verified Transactions",${facts.transaction_count || 0}`);
  lines.push("");

  // 2. Expense Analysis by Category
  const categories: any[] = ((facts.categories as unknown) as any[]) || [];
  lines.push(`"2. EXPENSE ANALYSIS BY CATEGORY"`);
  lines.push(`"Category","Outflow (INR)","Percentage Share"`);
  if (categories.length > 0) {
    categories.forEach((cat) => {
      lines.push(`"${cat.category_name || "General"}","${cat.formatted_total || "₹0.00"}","${cat.percentage || 0}%"`);
    });
  } else {
    lines.push(`"No category expenses recorded","₹0.00","0%"`);
  }
  lines.push("");

  // 3. Statistical Outliers & Anomalies
  lines.push(`"3. STATISTICAL OUTLIERS (MAD ENGINE)"`);
  lines.push(`"Date","Description","Amount","Evidence"`);
  if (report.anomalies && report.anomalies.length > 0) {
    report.anomalies.forEach((a) => {
      lines.push(`"${a.date}","${(a.description || "").replace(/"/g, '""')}","${a.amount}","${(a.evidence || "").replace(/"/g, '""')}"`);
    });
  } else {
    lines.push(`"None detected","No unusual spikes identified","₹0.00","Clean baseline"`);
  }
  lines.push("");

  // 4. Key Observations & Recommendations
  lines.push(`"4. KEY FINANCIAL OBSERVATIONS"`);
  if (report.recommendations && report.recommendations.length > 0) {
    report.recommendations.forEach((rec, idx) => {
      lines.push(`"${idx + 1}.","${rec.replace(/"/g, '""').replace(/\*\*/g, "")}"`);
    });
  } else {
    lines.push(`"1.","Spending aligned with target limits."`);
  }
  lines.push("");

  // 5. Executive Narrative & Disclaimer
  lines.push(`"5. STATEMENT DISCLOSURES"`);
  lines.push(`"Executive Summary","${report.executive_summary.replace(/"/g, '""').replace(/\*\*/g, "")}"`);
  lines.push(`"Certification","${report.disclaimer.replace(/"/g, '""')}"`);

  return "\uFEFF" + lines.join("\n");
}

/**
 * 4b. Export Monthly Statement as CSV
 */
export function exportMonthlyStatementCSV(
  report: MonthlyReportResponse,
  filenamePrefix = "pennypilot_statement"
): void {
  if (typeof document === "undefined") return;

  const csv = buildMonthlyStatementCSV(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = `${report.year}_${String(report.month).padStart(2, "0")}`;
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 4c. Export Monthly Statement as PDF
 */
export function exportMonthlyStatementPDF(
  report: MonthlyReportResponse,
  filenamePrefix = "pennypilot_statement"
): void {
  if (typeof document === "undefined") return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[report.month - 1] || `Month ${report.month}`;
  const facts = report.measured_facts || {};

  // Header Banner
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("PennyPilot — Personal Financial Statement", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(204, 251, 241);
  doc.text(
    `Reporting Period: ${monthName} ${report.year}  |  Generated: ${new Date().toLocaleDateString("en-IN")}  |  Status: ${report.health_status}`,
    14,
    21
  );

  let currentY = 36;

  // 1. Executive Summary Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Executive Summary & Measured Facts", 14, currentY);
  currentY += 4;

  const summaryRows = [
    ["Total Inflow", facts.income || "₹0.00", "Verified primary income streams"],
    ["Total Outflow", facts.expenses || "₹0.00", "Operational living expenses & debits"],
    ["Net Capital Retained", facts.net_balance || "₹0.00", "Unallocated monthly surplus / deficit"],
    ["Savings Rate", facts.savings_rate || "0%", "Target benchmark: ≥ 25.0%"],
    ["Budget Allocated", facts.budget_limit || "₹0.00", "Total active category allocations"],
    ["Budget Consumed", facts.budget_spent || "₹0.00", `Utilization: ${facts.budget_utilization || "0%"}`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [["Financial Metric", "Amount / Ratio", "Context & Guidance"]],
    body: summaryRows,
    theme: "striped",
    headStyles: { fillColor: [15, 118, 110], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 40, halign: "right", fontStyle: "bold" },
      2: { cellWidth: "auto" },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Executive narrative paragraph
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const narrativeLines = doc.splitTextToSize(
    report.executive_summary.replace(/\*\*/g, ""),
    182
  );
  doc.text(narrativeLines, 14, currentY);
  currentY += narrativeLines.length * 4.5 + 6;

  // 2. Expense Analysis by Category Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Expense Analysis & Outflow Distribution", 14, currentY);
  currentY += 4;

  const categories: any[] = ((facts.categories as unknown) as any[]) || [];
  const catRows = categories.length > 0
    ? categories.map((c) => [
        c.category_name || "General",
        c.formatted_total || "₹0.00",
        `${c.percentage || 0}%`,
        c.percentage > 30 ? "Dominant Outflow" : "Balanced",
      ])
    : [["No category expenses recorded", "₹0.00", "0%", "N/A"]];

  autoTable(doc, {
    startY: currentY,
    head: [["Category", "Total Outflow", "Share (%)", "Assessment"]],
    body: catRows,
    theme: "striped",
    headStyles: { fillColor: [15, 118, 110], fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 40, halign: "right", fontStyle: "bold" },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: "auto" },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page break for Section 3
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 3. Statistical Outliers & Observations
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Key Financial Observations & Anomaly Signals", 14, currentY);
  currentY += 4;

  const observations = (report.recommendations && report.recommendations.length > 0)
    ? report.recommendations.map((r, i) => `${i + 1}. ${r.replace(/\*\*/g, "")}`)
    : ["1. Spending is aligned with configured budget allocations."];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  observations.forEach((obs) => {
    const lines = doc.splitTextToSize(obs, 182);
    doc.text(lines, 14, currentY);
    currentY += lines.length * 4.2 + 2;
  });

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "PennyPilot Certified Personal Financial Statement • Zero Financial Hallucination • Deterministic Integer Paise Math",
      14,
      288
    );
    doc.text(`Page ${i} of ${totalPages}`, 196, 288, { align: "right" });
  }

  const dateStamp = `${report.year}_${String(report.month).padStart(2, "0")}`;
  doc.save(`${filenamePrefix}_${dateStamp}.pdf`);
}

/**
 * 4d. Export Monthly Statement as DOCX
 */
export function exportMonthlyStatementDOCX(
  report: MonthlyReportResponse,
  filenamePrefix = "pennypilot_statement"
): void {
  if (typeof document === "undefined") return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthName = monthNames[report.month - 1] || `Month ${report.month}`;
  const facts = report.measured_facts || {};
  const categories: any[] = ((facts.categories as unknown) as any[]) || [];

  const catRowsHtml = categories.length > 0
    ? categories
        .map(
          (c) =>
            `<tr><td><strong>${c.category_name}</strong></td><td style="text-align: right; font-weight: bold;">${c.formatted_total}</td><td style="text-align: center;">${c.percentage}%</td></tr>`
        )
        .join("")
    : `<tr><td colspan="3">No category expenses recorded</td></tr>`;

  const anomalyRowsHtml = report.anomalies && report.anomalies.length > 0
    ? report.anomalies
        .map(
          (a) =>
            `<tr><td>${a.date}</td><td><strong>${a.description}</strong></td><td style="text-align: right; color: #e11d48; font-weight: bold;">${a.amount}</td><td>${a.evidence}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="4">No statistical anomalies flagged for this period.</td></tr>`;

  const recsHtml = report.recommendations && report.recommendations.length > 0
    ? report.recommendations
        .map((r, i) => `<p style="font-size: 9.5pt; margin-bottom: 6pt;"><strong>${i + 1}.</strong> ${r.replace(/\*\*/g, "")}</p>`)
        .join("")
    : `<p style="font-size: 9.5pt;">Spending is aligned with configured budget allocations.</p>`;

  const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>PennyPilot — Personal Financial Statement</title>
  <style>
    body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; margin: 30pt; color: #1e293b; }
    .header-bar { background-color: #0f766e; padding: 16pt 20pt; border-radius: 4pt; color: #ffffff; margin-bottom: 20pt; }
    h1 { font-size: 18pt; margin: 0 0 6pt 0; font-family: 'Georgia', serif; }
    .subtitle { font-size: 10pt; color: #ccfbf1; }
    h2 { font-size: 12pt; color: #0f766e; border-bottom: 1.5pt solid #0f766e; padding-bottom: 3pt; margin-top: 18pt; margin-bottom: 8pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 14pt; }
    th { background-color: #0f766e; color: #ffffff; font-size: 9.5pt; padding: 6pt 8pt; text-align: left; }
    td { font-size: 9pt; padding: 5pt 8pt; border-bottom: 1px solid #e2e8f0; }
    .footer { font-size: 8pt; color: #94a3b8; margin-top: 24pt; border-top: 1px solid #e2e8f0; padding-top: 6pt; }
  </style>
</head>
<body>
  <div class="header-bar">
    <h1>PennyPilot — Personal Financial Statement</h1>
    <div class="subtitle">Reporting Period: ${monthName} ${report.year}  |  Generated: ${new Date().toLocaleDateString("en-IN")}  |  Status: ${report.health_status}</div>
  </div>

  <h2>1. Executive Summary & Measured Facts</h2>
  <table>
    <thead>
      <tr><th>Metric</th><th style="text-align: right;">Amount / Ratio</th><th>Guidance</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Total Inflow</strong></td><td style="text-align: right; color: #0f766e; font-weight: bold;">${facts.income || "₹0.00"}</td><td>Verified primary income streams</td></tr>
      <tr><td><strong>Total Outflow</strong></td><td style="text-align: right; color: #e11d48; font-weight: bold;">${facts.expenses || "₹0.00"}</td><td>Operational living expenses & debits</td></tr>
      <tr><td><strong>Net Capital Retained</strong></td><td style="text-align: right; font-weight: bold;">${facts.net_balance || "₹0.00"}</td><td>Unallocated monthly surplus / deficit</td></tr>
      <tr><td><strong>Savings Rate</strong></td><td style="text-align: right; font-weight: bold;">${facts.savings_rate || "0%"}</td><td>Target: ≥ 25.0%</td></tr>
      <tr><td><strong>Budget Limit</strong></td><td style="text-align: right;">${facts.budget_limit || "₹0.00"}</td><td>Total active category allocations</td></tr>
      <tr><td><strong>Budget Spent</strong></td><td style="text-align: right;">${facts.budget_spent || "₹0.00"}</td><td>Utilization: ${facts.budget_utilization || "0%"}</td></tr>
    </tbody>
  </table>

  <p style="font-size: 9.5pt; font-style: italic; line-height: 1.5; color: #334155; margin-bottom: 16pt;">
    ${report.executive_summary.replace(/\*\*/g, "")}
  </p>

  <h2>2. Expense Analysis by Category</h2>
  <table>
    <thead>
      <tr><th>Category</th><th style="text-align: right;">Total Outflow</th><th style="text-align: center;">Share (%)</th></tr>
    </thead>
    <tbody>
      ${catRowsHtml}
    </tbody>
  </table>

  <h2>3. Statistical Outlier & Anomaly Detections (MAD Engine)</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Description</th><th style="text-align: right;">Amount</th><th>Evidence</th></tr>
    </thead>
    <tbody>
      ${anomalyRowsHtml}
    </tbody>
  </table>

  <h2>4. Key Financial Observations & Telemetry</h2>
  ${recsHtml}

  <div class="footer">
    PennyPilot Certified Personal Financial Statement • Zero Financial Hallucination • Computed in Integer Paise
  </div>
</body>
</html>`;

  const blob = new Blob([docHtml], { type: "application/vnd.ms-word;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = `${report.year}_${String(report.month).padStart(2, "0")}`;
  link.href = url;
  link.download = `${filenamePrefix}_${dateStamp}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
