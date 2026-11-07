import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { fetchHealth } from "../../lib/api";

export const HealthBadge: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  });

  const isHealthy = data?.status === "healthy";

  return (
    <div className="flex items-center gap-1.5 select-none shrink-0">
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-ledger-border bg-ledger-surfaceSubtle text-[11px] font-mono text-ledger-inkMuted shrink-0"
        title={isHealthy ? "System Online: Database connected" : "Connecting to database..."}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isHealthy ? "bg-ledger-sage" : "bg-ledger-amber animate-pulse"
          }`}
        />
        <span className="hidden xl:inline">{isLoading ? "Connecting..." : isHealthy ? "Online" : "Degraded"}</span>
      </div>

      <div
        className="hidden 2xl:inline-flex items-center gap-1 px-2 py-1 rounded border border-ledger-border bg-ledger-surfaceSubtle text-[11px] font-mono text-ledger-inkMuted shrink-0"
        title="3-Tier Financial Intelligence: Hosted AI -> Local AI -> Deterministic Engine"
      >
        <ShieldCheck className="w-3 h-3 text-ledger-teal shrink-0" />
        <span>3-Tier AI</span>
      </div>
    </div>
  );
};
