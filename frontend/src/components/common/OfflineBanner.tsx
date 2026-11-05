import React from "react";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export const OfflineBanner: React.FC = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-ledger-amberLight/70 border-b border-ledger-amber/30 text-ledger-amber px-4 py-1.5 text-xs font-mono flex items-center justify-center gap-2 transition-all duration-200 select-none"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        <strong>Offline Mode Active:</strong> Running from local application shell. Financial summaries remain accessible offline.
      </span>
    </div>
  );
};
