import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base accessible Quiet Ledger pulse skeleton primitive.
 * Marked with aria-hidden="true" so screen readers ignore individual decorative elements.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = "", style }) => {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={`animate-pulse bg-ledger-surfaceSubtle border border-ledger-borderSubtle/50 rounded ${className}`}
    />
  );
};

/**
 * Dashboard KPI Metric Cards Skeleton (6-card 3x2 grid).
 */
export const DashboardMetricCardsSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading financial summary metrics"
      className="space-y-4 sm:space-y-5"
    >
      <span className="sr-only">Loading financial summary metrics...</span>
      {/* Row 1 Skeleton: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card-base p-4 sm:p-5 h-[126px] flex flex-col justify-between"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <div>
              <Skeleton className="h-7 w-32 mb-1.5" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
      {/* Row 2 Skeleton: 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 min-w-0">
        {[4, 5, 6].map((i) => (
          <div
            key={i}
            className="card-base p-4 sm:p-5 h-[126px] flex flex-col justify-between"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <div>
              <Skeleton className="h-7 w-32 mb-1.5" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Hero Budget Intelligence & Spending Pace Chart Skeleton.
 */
export const HeroChartSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading budget intelligence and spending chart"
      className="card-base p-4 sm:p-6 space-y-4 sm:space-y-5"
    >
      <span className="sr-only">Loading budget intelligence and spending chart...</span>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ledger-borderSubtle">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>

      {/* 4 Summary Stat Panels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-3 bg-ledger-surfaceSubtle rounded-md space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>

      {/* Chart Canvas Area */}
      <div className="h-44 sm:h-52 w-full pt-4 flex flex-col justify-between" aria-hidden="true">
        <div className="space-y-4">
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
        </div>
        <div className="flex justify-between pt-2">
          <Skeleton className="h-2.5 w-8" />
          <Skeleton className="h-2.5 w-8" />
          <Skeleton className="h-2.5 w-8" />
          <Skeleton className="h-2.5 w-8" />
        </div>
      </div>
    </div>
  );
};

/**
 * Two-Column Cards Skeleton (Recent Transactions + Income Streams & Insights).
 */
export const TwoColumnCardsSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading recent transactions, income streams and insights"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 md:gap-6 min-w-0 items-start"
    >
      <span className="sr-only">Loading recent transactions, income streams and insights...</span>
      {/* Left wider column skeleton */}
      <div className="lg:col-span-7 xl:col-span-8 card-base p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ledger-borderSubtle">
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <div className="space-y-3 pt-1">
          {[1, 2, 3, 4, 5].map((rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
      {/* Right column skeleton: Income Streams */}
      <div className="lg:col-span-5 xl:col-span-4 card-base p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ledger-borderSubtle">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <div className="space-y-3 pt-1">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
};

/**
 * Transaction Ledger Table Skeleton.
 */
export const TransactionListSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading transaction ledger entries"
      className="card-base p-0 overflow-hidden min-w-0 divide-y divide-ledger-borderSubtle"
    >
      <span className="sr-only">Loading transaction ledger entries...</span>
      
      {/* Table Header Row */}
      <div className="hidden sm:grid grid-cols-12 gap-3 px-4 sm:px-6 py-3 bg-ledger-surfaceSubtle">
        <Skeleton className="h-3 w-16 col-span-2" />
        <Skeleton className="h-3 w-28 col-span-4" />
        <Skeleton className="h-3 w-20 col-span-3" />
        <Skeleton className="h-3 w-20 col-span-2 text-right ml-auto" />
        <Skeleton className="h-3 w-10 col-span-1 ml-auto" />
      </div>

      {/* 6 Simulated Table Rows */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="px-4 sm:px-6 py-3.5 sm:py-4 flex sm:grid sm:grid-cols-12 gap-3 items-center justify-between"
          aria-hidden="true"
        >
          {/* Mobile Date + Description / Desktop Date */}
          <div className="sm:col-span-2 flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md sm:hidden shrink-0" />
            <Skeleton className="h-3 w-20" />
          </div>

          {/* Description & Merchant */}
          <div className="hidden sm:block sm:col-span-4 space-y-1">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-2.5 w-24" />
          </div>

          {/* Category Chip */}
          <div className="hidden sm:block sm:col-span-3">
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          {/* Amount */}
          <div className="sm:col-span-2 text-right ml-auto sm:ml-0">
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>

          {/* Action buttons */}
          <div className="hidden sm:flex sm:col-span-1 justify-end gap-1.5">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Budget Management Grid Skeleton.
 */
export const BudgetManagementSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading category budgets"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
    >
      <span className="sr-only">Loading category budgets...</span>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="card-base p-4 sm:p-5 space-y-3.5 flex flex-col justify-between min-h-[160px]"
          aria-hidden="true"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          <div className="pt-2 border-t border-ledger-borderSubtle flex justify-between items-center">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
