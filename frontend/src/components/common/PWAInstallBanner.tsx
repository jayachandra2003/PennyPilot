import React, { useState } from "react";
import { Download, Share } from "lucide-react";
import { PennyPilotLogo } from "./PennyPilotLogo";
import { usePWAInstallPrompt } from "../../hooks/usePWAInstallPrompt";

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, dismissPrompt, promptInstall } = usePWAInstallPrompt();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or dismissed, do not render
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide((prev) => !prev);
      return;
    }

    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="PennyPilot Application Installation"
      className="bg-ledger-surface border border-ledger-teal/30 rounded-lg p-3.5 sm:p-4 shadow-sm mb-4 transition-all duration-200 animate-fade-in"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 mt-0.5 sm:mt-0">
            <PennyPilotLogo variant="symbol" size="md" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-ledger-teal">
                Web App
              </span>
              <span className="text-[11px] text-ledger-inkSubtle">•</span>
              <span className="text-[11px] text-ledger-inkSubtle">Fast & Offline Ready</span>
            </div>
            <h3 className="font-serif text-sm sm:text-base font-semibold text-ledger-ink leading-snug">
              Install PennyPilot on your device
            </h3>
            <p className="text-xs text-ledger-inkMuted mt-0.5 leading-relaxed">
              Experience instant loading, full-screen financial ledger access, and verified calculations on the go.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-1 sm:pt-0">
          <button
            type="button"
            onClick={dismissPrompt}
            className="btn-secondary text-xs px-3 py-2 min-h-[44px] min-w-[44px] focus-ring"
            aria-label="Dismiss installation prompt for 14 days"
            title="Dismiss for 14 days"
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="btn-primary text-xs px-3.5 py-2 min-h-[44px] flex items-center justify-center gap-1.5 focus-ring"
            aria-label={isIOS ? "View iOS installation instructions" : "Install PennyPilot application"}
          >
            {isIOS ? (
              <>
                <Share className="w-3.5 h-3.5" />
                <span>{showIOSGuide ? "Hide Instructions" : "Install on iOS"}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{isInstalling ? "Installing..." : "Install App"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* iOS Safari Installation Steps Guide */}
      {isIOS && showIOSGuide && (
        <div className="mt-3 pt-3 border-t border-ledger-borderSubtle text-xs text-ledger-inkMuted space-y-2 bg-ledger-surfaceSubtle p-3 rounded-md">
          <p className="font-medium text-ledger-ink">
            To install on iPhone or iPad Safari:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-ledger-inkSubtle">
            <li>
              Tap the <span className="font-semibold text-ledger-ink">Share</span> button{" "}
              <Share className="inline w-3 h-3 text-ledger-teal" /> in your Safari toolbar.
            </li>
            <li>
              Scroll down and select{" "}
              <span className="font-semibold text-ledger-ink">Add to Home Screen</span>.
            </li>
            <li>
              Tap <span className="font-semibold text-ledger-ink">Add</span> in the top right corner.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};
