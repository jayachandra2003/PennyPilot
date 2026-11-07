import React from "react";

interface PennyPilotLogoProps {
  variant?: "full" | "symbol";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

export const PennyPilotLogo: React.FC<PennyPilotLogoProps> = ({
  variant = "full",
  size = "sm",
  className = "",
  showText,
}) => {
  // If showText is explicitly passed, obey it; otherwise full variant shows text
  const renderText = showText !== undefined ? showText : variant === "full";

  const sizeMap = {
    xs: { img: "w-5 h-5", text: "text-sm", gap: "gap-1.5" },
    sm: { img: "w-7 h-7 sm:w-8 sm:h-8", text: "text-base sm:text-lg", gap: "gap-2 sm:gap-2.5" },
    md: { img: "w-9 h-9 sm:w-10 sm:h-10", text: "text-lg sm:text-xl", gap: "gap-2.5" },
    lg: { img: "w-12 h-12 sm:w-14 sm:h-14", text: "text-2xl sm:text-3xl", gap: "gap-3" },
    xl: { img: "w-16 h-16 sm:w-20 sm:h-20", text: "text-3xl sm:text-4xl", gap: "gap-3.5" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center ${currentSize.gap} select-none ${className}`}>
      {/* Official Dimensional Geometric Logo Mark */}
      <img
        src="/favicon.svg"
        alt="PennyPilot Logo"
        className={`${currentSize.img} object-contain shrink-0 drop-shadow-[0_2px_6px_rgba(15,118,110,0.18)] transition-transform group-hover:scale-105`}
        loading="eager"
        decoding="async"
      />

      {renderText && (
        <span
          className={`font-sans font-bold tracking-tight text-ledger-ink ${currentSize.text} leading-none`}
        >
          PennyPilot
        </span>
      )}
    </div>
  );
};
