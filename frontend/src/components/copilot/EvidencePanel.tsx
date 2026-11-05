import React, { useState } from "react";
import { ChevronDown, ChevronUp, Database, AlertTriangle, PieChart, Layers } from "lucide-react";
import type { CopilotEvidence } from "../../lib/api";

interface EvidencePanelProps {
  evidence: CopilotEvidence;
  provider: string;
  tier: number;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  provider,
  tier,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const { totals, period, categories, anomalies, top_expenses, mom_delta } = evidence;

  const providerLabel =
    provider === "ollama"
      ? "Ollama (Qwen 2.5:3B)"
      : provider === "gemini"
      ? "Gemini Free Tier"
      : "Deterministic Engine";

  return (
    <div className="mt-3 border border-ledger-border rounded-xl bg-ledger-bg/60 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between bg-ledger-surface hover:bg-ledger-borderSubtle/30 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-ledger-teal" />
          <span className="font-semibold text-ledger-ink">Verified Fact Bundle</span>
          <span className="text-[10px] bg-ledger-tealLight text-ledger-teal font-mono px-2 py-0.5 rounded-full border border-ledger-teal/20">
            {providerLabel} • Tier {tier}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-ledger-inkMuted hover:text-ledger-ink">
          <span className="text-[11px]">{isOpen ? "Hide Evidence" : "Inspect Verified Data"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 border-t border-ledger-borderSubtle animate-fade-in text-ledger-ink">
          {/* 1. Core Financial Telemetry Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ledger-inkMuted">
                Period Telemetry ({period.year}-{period.month.toString().padStart(2, "0")})
              </span>
              <span className="text-[10px] text-ledger-inkSubtle">
                {period.elapsed_days}/{period.total_days} days elapsed
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-ledger-surface rounded-lg border border-ledger-borderSubtle">
                <div className="text-[10px] text-ledger-inkMuted">Income</div>
                <div className="font-bold text-ledger-ink tabular-nums text-xs">{totals.income_formatted}</div>
              </div>
              <div className="p-2 bg-ledger-surface rounded-lg border border-ledger-borderSubtle">
                <div className="text-[10px] text-ledger-inkMuted">Expenses</div>
                <div className="font-bold text-ledger-ink tabular-nums text-xs">{totals.expense_formatted}</div>
              </div>
              <div className="p-2 bg-ledger-surface rounded-lg border border-ledger-borderSubtle">
                <div className="text-[10px] text-ledger-inkMuted">Net Balance</div>
                <div className="font-bold text-ledger-teal tabular-nums text-xs">{totals.net_balance_formatted}</div>
              </div>
              <div className="p-2 bg-ledger-surface rounded-lg border border-ledger-borderSubtle">
                <div className="text-[10px] text-ledger-inkMuted">Savings Rate</div>
                <div className="font-bold text-ledger-ink tabular-nums text-xs">{totals.savings_rate_percent}%</div>
              </div>
            </div>
          </div>

          {/* 2. Month-over-Month Delta (if available) */}
          {mom_delta && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ledger-inkMuted mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-ledger-teal" />
                Month-over-Month Shift
              </div>
              <div className="p-2.5 bg-ledger-surface rounded-lg border border-ledger-borderSubtle space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-ledger-inkMuted">Expense Change:</span>
                  <span className="font-bold tabular-nums">
                    {mom_delta.expense_delta_formatted} ({mom_delta.expense_pct_change}%)
                  </span>
                </div>
                {mom_delta.category_shifts.length > 0 && (
                  <div className="pt-1 text-[11px] text-ledger-inkSubtle space-y-0.5">
                    {mom_delta.category_shifts.slice(0, 3).map((shift, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{shift.category_name}</span>
                        <span className="font-mono text-ledger-ink">{shift.diff_formatted}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Top Category Share */}
          {categories.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ledger-inkMuted mb-1.5 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-ledger-teal" />
                Category Distribution
              </div>
              <div className="space-y-1.5">
                {categories.slice(0, 4).map((c) => (
                  <div key={c.category_id} className="flex items-center justify-between text-[11px] bg-ledger-surface p-1.5 px-2.5 rounded border border-ledger-borderSubtle">
                    <span className="font-medium">{c.category_name}</span>
                    <span className="tabular-nums font-mono text-ledger-inkSubtle">
                      {c.formatted_total} ({c.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Grounded Anomaly Spikes */}
          {anomalies && anomalies.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Statistical Spending Spikes (MAD Score &ge; 3.0)
              </div>
              <div className="space-y-1.5">
                {anomalies.map((a, idx) => (
                  <div key={idx} className="p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span>{a.description}</span>
                      <span className="tabular-nums font-mono">{a.amount_formatted}</span>
                    </div>
                    <p className="text-[10px] text-amber-800 leading-tight">{a.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Recent Top Expenses */}
          {top_expenses && top_expenses.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ledger-inkMuted mb-1.5">
                Top Ledger Line Items
              </div>
              <div className="space-y-1">
                {top_expenses.slice(0, 3).map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 px-2 bg-ledger-surface rounded text-[11px] border border-ledger-borderSubtle">
                    <div>
                      <span className="font-medium">{t.description}</span>
                      <span className="text-[10px] text-ledger-inkMuted ml-1.5">({t.category_name})</span>
                    </div>
                    <span className="font-bold tabular-nums">{t.formatted_amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
