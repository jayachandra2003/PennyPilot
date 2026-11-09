import React from "react";

export const AuthShowcaseIllustration: React.FC<{ className?: string }> = ({
  className = "w-full max-w-[340px] sm:max-w-[380px]",
}) => {
  return (
    <div className={`relative mx-auto select-none ${className}`} aria-hidden="true">
      {/* Ambient Mint & Teal Backlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-200/40 via-teal-100/30 to-emerald-300/20 rounded-full blur-2xl transform scale-90" />

      {/* Main Illustration Container */}
      <div className="relative py-4">
        {/* Floating Receipt / Statement Sheet (Behind Laptop Left) */}
        <div className="absolute -top-1 left-2 sm:left-4 z-10 w-24 sm:w-28 bg-white/95 rounded-xl p-2.5 shadow-md border border-emerald-100 rotate-[-8deg] transform transition-transform hover:rotate-[-6deg]">
          <div className="w-8 h-1.5 bg-emerald-700/60 rounded-full mb-2" />
          <div className="space-y-1.5">
            <div className="w-full h-1 bg-slate-200 rounded-full" />
            <div className="w-4/5 h-1 bg-slate-200 rounded-full" />
            <div className="w-3/5 h-1 bg-slate-200 rounded-full" />
            <div className="pt-1 border-t border-dashed border-slate-200 flex justify-between">
              <span className="w-5 h-1 bg-emerald-500 rounded-full" />
              <span className="w-4 h-1 bg-emerald-700 rounded-full" />
            </div>
          </div>
        </div>

        {/* Central Laptop Device */}
        <div className="relative z-20 mx-auto w-64 sm:w-72">
          {/* Laptop Screen Display */}
          <div className="bg-slate-900 rounded-t-2xl p-2 sm:p-2.5 shadow-xl border-t border-x border-slate-700">
            {/* Screen Inner Bezel */}
            <div className="bg-[#F8FAF9] rounded-xl p-3 sm:p-3.5 space-y-2.5 overflow-hidden">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="h-2 w-16 bg-emerald-100 rounded-full" />
              </div>

              {/* Chart Widgets Row */}
              <div className="grid grid-cols-2 gap-2 pt-1 items-end">
                {/* Mini Bar Chart */}
                <div className="bg-white rounded-lg p-2 border border-slate-200/60 shadow-2xs space-y-1.5">
                  <div className="h-1.5 w-10 bg-slate-300 rounded-full" />
                  <div className="flex items-end justify-between h-10 px-1 gap-1">
                    <div className="w-2.5 h-6 bg-emerald-300 rounded-t" />
                    <div className="w-2.5 h-9 bg-[#0A5C4D] rounded-t" />
                    <div className="w-2.5 h-4 bg-teal-400 rounded-t" />
                    <div className="w-2.5 h-8 bg-emerald-500 rounded-t" />
                  </div>
                </div>

                {/* Mini Donut / Pie Chart */}
                <div className="bg-white rounded-lg p-2 border border-slate-200/60 shadow-2xs flex flex-col items-center justify-center space-y-1">
                  <div className="relative w-10 h-10">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#0A5C4D"
                        strokeWidth="5"
                        strokeDasharray="50 100"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#14B8A6"
                        strokeWidth="5"
                        strokeDasharray="30 100"
                        strokeDashoffset="-50"
                      />
                    </svg>
                  </div>
                  <div className="h-1.5 w-8 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Laptop Base Stand */}
          <div className="relative bg-slate-300 rounded-b-xl h-3.5 sm:h-4 shadow-lg flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-400 rounded-full" />
          </div>
          <div className="mx-auto w-40 sm:w-44 h-1 bg-slate-400/50 rounded-b-lg" />
        </div>

        {/* Stacked Gold Coins (Bottom Left) */}
        <div className="absolute bottom-2 left-6 sm:left-8 z-30 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 border-2 border-amber-200 shadow-md flex items-center justify-center text-amber-900 font-extrabold text-xs">
            ₹
          </div>
          <div className="w-7 h-7 -ml-3.5 mt-2 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-amber-200 shadow-md flex items-center justify-center text-amber-950 font-bold text-[10px]">
            ₹
          </div>
        </div>

        {/* Floating AI Intelligence Badge (Bottom Right) */}
        <div className="absolute bottom-2 right-4 sm:right-6 z-30 bg-white/95 rounded-2xl p-2.5 border border-emerald-200 shadow-lg backdrop-blur-md flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-[#0A5C4D] flex items-center justify-center font-bold text-xs">
            ✨
          </div>
          <div className="pr-1">
            <p className="text-[10px] font-bold text-slate-800">PennyPilot AI</p>
            <p className="text-[9px] text-emerald-700 font-medium">Verified Ledger</p>
          </div>
        </div>
      </div>
    </div>
  );
};
