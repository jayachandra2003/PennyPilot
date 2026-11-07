import { ArrowLeft } from "lucide-react";
import { PennyPilotLogo } from "./PennyPilotLogo";

interface NotFoundProps {
  onBackToHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onBackToHome }) => {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center bg-ledger-surface p-8 rounded-2xl border border-ledger-border shadow-card">
        <div className="flex items-center justify-center mx-auto mb-4">
          <PennyPilotLogo variant="symbol" size="lg" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-ledger-ink mb-2">404 — Ledger Entry Missing</h1>
        <p className="text-sm text-ledger-inkMuted mb-6 leading-relaxed">
          The financial record or page you are navigating to could not be found or has been moved to another ledger partition.
        </p>
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ledger-teal text-white text-sm font-medium hover:bg-ledger-tealHover transition-colors focus-ring"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
