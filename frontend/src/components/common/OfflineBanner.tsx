import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export const OfflineBanner: React.FC = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-ledger-amberLight border-b border-ledger-amber/30 text-ledger-amber px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>
        <strong>Offline Mode Active:</strong> Running from local application shell. Financial summaries remain accessible offline.
      </span>
    </div>
  );
};
