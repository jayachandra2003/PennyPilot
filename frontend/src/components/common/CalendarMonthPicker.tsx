import React, { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

interface CalendarMonthPickerProps {
  year: number;
  month: number; // 1-12
  onSelect: (year: number, month: number) => void;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORTS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const CalendarMonthPicker: React.FC<CalendarMonthPickerProps> = ({
  year,
  month,
  onSelect,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "months" | "years">("calendar");
  const [navYear, setNavYear] = useState(year);
  const [navMonth, setNavMonth] = useState(month);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal navigation year/month when prop changes
  useEffect(() => {
    setNavYear(year);
    setNavMonth(month);
  }, [year, month]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setViewMode("calendar");
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setViewMode("calendar");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setNavYear(year);
    setNavMonth(month);
    setViewMode("calendar");
    setIsOpen(!isOpen);
  };

  const handleSelectMonth = (selectedYear: number, selectedMonth: number) => {
    onSelect(selectedYear, selectedMonth);
    setIsOpen(false);
    setViewMode("calendar");
  };

  // Calendar day calculation helpers
  const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m - 1, 1).getDay();

  const totalDays = daysInMonth(navYear, navMonth);
  const startDay = firstDayOfMonth(navYear, navMonth);
  const prevMonthDays = daysInMonth(navMonth === 1 ? navYear - 1 : navYear, navMonth === 1 ? 12 : navMonth - 1);

  // Decade calculation for Year view (e.g. 2020 - 2031)
  const decadeStart = Math.floor(navYear / 12) * 12;
  const decadeYears = Array.from({ length: 12 }, (_, i) => decadeStart + i);

  return (
    <div className={`relative inline-block z-40 ${className}`} ref={containerRef}>
      {/* Trigger Button: Displays Month & Year with Calendar Icon */}
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Select calendar month, current: ${MONTH_NAMES[month - 1]} ${year}`}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-ledger-surface text-ledger-ink font-mono text-xs sm:text-sm font-semibold transition-colors focus-ring cursor-pointer select-none border border-transparent hover:border-ledger-border"
      >
        <CalendarIcon className="w-4 h-4 text-ledger-teal shrink-0" aria-hidden="true" />
        <span>{MONTH_NAMES[month - 1]} {year}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-ledger-inkSubtle transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Month and year picker"
          className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-0 top-full mt-2 w-[calc(100vw-2.5rem)] sm:w-80 max-w-[320px] bg-white dark:bg-[#141F2B] border border-slate-200 dark:border-[#2A3B45] rounded-2xl shadow-2xl z-50 p-3.5 sm:p-4 text-ledger-ink animate-fade-in select-none"
        >
          {/* Header Navigation Controls */}
          <div className="flex items-center justify-between border-b border-ledger-borderSubtle pb-2.5 mb-3">
            {/* Nav Title: Switch between Calendar, Month grid, and Year grid */}
            <div className="flex items-center gap-1.5">
              {viewMode === "calendar" && (
                <button
                  type="button"
                  onClick={() => setViewMode("months")}
                  className="px-2 py-1 rounded hover:bg-ledger-surfaceSubtle text-xs font-semibold font-mono text-ledger-ink hover:text-ledger-teal transition-colors focus-ring"
                >
                  {MONTH_NAMES[navMonth - 1]} {navYear}
                </button>
              )}

              {viewMode === "months" && (
                <button
                  type="button"
                  onClick={() => setViewMode("years")}
                  className="px-2 py-1 rounded hover:bg-ledger-surfaceSubtle text-xs font-semibold font-mono text-ledger-ink hover:text-ledger-teal transition-colors focus-ring"
                >
                  {navYear} (Select Year)
                </button>
              )}

              {viewMode === "years" && (
                <span className="px-2 py-1 text-xs font-semibold font-mono text-ledger-ink">
                  {decadeStart} – {decadeStart + 11}
                </span>
              )}
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (viewMode === "calendar") {
                    if (navMonth === 1) {
                      setNavMonth(12);
                      setNavYear(navYear - 1);
                    } else {
                      setNavMonth(navMonth - 1);
                    }
                  } else if (viewMode === "months") {
                    setNavYear(navYear - 1);
                  } else {
                    setNavYear(decadeStart - 12);
                  }
                }}
                className="p-1 rounded text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surfaceSubtle min-h-[32px] min-w-[32px] flex items-center justify-center focus-ring"
                aria-label="Previous period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (viewMode === "calendar") {
                    if (navMonth === 12) {
                      setNavMonth(1);
                      setNavYear(navYear + 1);
                    } else {
                      setNavMonth(navMonth + 1);
                    }
                  } else if (viewMode === "months") {
                    setNavYear(navYear + 1);
                  } else {
                    setNavYear(decadeStart + 12);
                  }
                }}
                className="p-1 rounded text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-surfaceSubtle min-h-[32px] min-w-[32px] flex items-center justify-center focus-ring"
                aria-label="Next period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VIEW 1: Calendar Day Grid */}
          {viewMode === "calendar" && (
            <div className="space-y-2">
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 text-center text-[10px] font-mono font-semibold text-ledger-inkSubtle py-1 border-b border-ledger-borderSubtle">
                {WEEKDAYS.map((wd) => (
                  <span key={wd}>{wd}</span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-xs font-mono text-center">
                {/* Trailing days of previous month */}
                {Array.from({ length: startDay }).map((_, i) => {
                  const dayNum = prevMonthDays - startDay + i + 1;
                  return (
                    <span
                      key={`prev-${i}`}
                      className="py-1.5 text-ledger-inkFaint opacity-40 select-none"
                    >
                      {dayNum}
                    </span>
                  );
                })}

                {/* Days of current navigation month */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const dayNum = i + 1;
                  const isCurrentSelected = navYear === year && navMonth === month;
                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => handleSelectMonth(navYear, navMonth)}
                      className={`py-1.5 rounded transition-all min-h-[32px] flex items-center justify-center ${
                        isCurrentSelected && dayNum === 1
                          ? "bg-ledger-teal text-white dark:text-slate-950 font-bold shadow-xs"
                          : "text-ledger-ink hover:bg-ledger-surfaceSubtle hover:text-ledger-teal"
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}

                {/* Leading days of next month to complete 6-row grid */}
                {Array.from({ length: (42 - (startDay + totalDays)) % 7 }).map((_, i) => (
                  <span
                    key={`next-${i}`}
                    className="py-1.5 text-ledger-inkFaint opacity-40 select-none"
                  >
                    {i + 1}
                  </span>
                ))}
              </div>

              {/* Bottom Quick Select Month CTA */}
              <div className="pt-2 border-t border-ledger-borderSubtle flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMode("months")}
                  className="text-[11px] text-ledger-teal font-medium hover:underline focus-ring"
                >
                  Choose Month Directly
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectMonth(navYear, navMonth)}
                  className="px-2.5 py-1 rounded bg-ledger-surfaceSubtle hover:bg-ledger-border text-ledger-ink text-[11px] font-semibold transition-colors focus-ring"
                >
                  Confirm {MONTH_SHORTS[navMonth - 1]} {navYear}
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: 12-Month Grid */}
          {viewMode === "months" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {MONTH_NAMES.map((name, idx) => {
                  const monthNum = idx + 1;
                  const isSelected = navYear === year && monthNum === month;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectMonth(navYear, monthNum)}
                      className={`py-2 px-1 rounded-lg text-xs font-medium font-mono transition-all min-h-[38px] flex items-center justify-center gap-1 ${
                        isSelected
                          ? "bg-ledger-teal text-white dark:text-slate-950 font-bold shadow-xs"
                          : "border border-ledger-borderSubtle bg-ledger-surfaceSubtle hover:bg-ledger-surface hover:border-ledger-teal text-ledger-ink"
                      } focus-ring`}
                    >
                      <span>{MONTH_SHORTS[idx]}</span>
                      {isSelected && <Check className="w-3 h-3 text-white dark:text-slate-950 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode("years")}
                  className="text-[11px] text-ledger-inkSubtle hover:text-ledger-teal font-mono focus-ring"
                >
                  Looking for another year? Pick Year ({navYear})
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: Decade Year Grid */}
          {viewMode === "years" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {decadeYears.map((yr) => {
                  const isSelected = yr === year;
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setNavYear(yr);
                        setViewMode("months");
                      }}
                      className={`py-2 px-1 rounded-lg text-xs font-mono font-medium transition-all min-h-[38px] flex items-center justify-center gap-1 ${
                        isSelected
                          ? "bg-ledger-teal text-white dark:text-slate-950 font-bold shadow-xs"
                          : "border border-ledger-borderSubtle bg-ledger-surfaceSubtle hover:bg-ledger-surface hover:border-ledger-teal text-ledger-ink"
                      } focus-ring`}
                    >
                      <span>{yr}</span>
                      {isSelected && <Check className="w-3 h-3 text-white dark:text-slate-950 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className="text-[11px] text-ledger-inkSubtle hover:text-ledger-teal font-mono focus-ring"
                >
                  Return to Calendar View
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
