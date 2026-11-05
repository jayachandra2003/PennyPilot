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
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isHealthy
            ? "bg-ledger-sageLight text-ledger-sage border-ledger-sage/30"
            : "bg-ledger-amberLight text-ledger-amber border-ledger-amber/30"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isHealthy ? "bg-ledger-sage animate-pulse" : "bg-ledger-amber"
          }`}
        />
        <span>{isLoading ? "Connecting..." : isHealthy ? "Backend Connected" : "Connecting..."}</span>
      </div>

      <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ledger-tealLight text-ledger-teal border border-ledger-teal/20">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>3-Tier AI Fallback</span>
      </div>
    </div>
  );
};
