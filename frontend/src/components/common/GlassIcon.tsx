import React from "react";
import {
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Home,
  Banknote,
  Briefcase,
  HeartPulse,
  Film,
  ShoppingBag,
  MoreHorizontal,
  TrendingUp,
  Tag,
  Coffee,
  Gift,
  Book,
  Plane,
  Dumbbell,
  Shield,
  Wallet,
  Receipt,
  PieChart,
  BarChart3,
  Sparkles,
} from "lucide-react";

export type GlassVariant =
  | "teal"
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "blue"
  | "purple"
  | "cyan"
  | "orange"
  | "slate"
  | "neutral";

export type GlassSize = "xs" | "sm" | "md" | "lg" | "xl";

interface VariantStyles {
  container: string;
  glyph: string;
  border: string;
  ring: string;
}

const VARIANT_MAP: Record<GlassVariant, VariantStyles> = {
  teal: {
    container:
      "bg-gradient-to-b from-teal-50/90 via-teal-100/40 to-teal-100/70 text-teal-800 dark:bg-gradient-to-b dark:from-teal-500/20 dark:via-teal-500/10 dark:to-teal-500/5 dark:text-teal-300",
    glyph: "text-teal-700 dark:text-teal-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(15,118,110,0.12)] dark:border-teal-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(45,212,191,0.20)]",
    ring: "focus-visible:ring-teal-500",
  },
  emerald: {
    container:
      "bg-gradient-to-b from-emerald-50/90 via-emerald-100/40 to-emerald-100/70 text-emerald-800 dark:bg-gradient-to-b dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-emerald-500/5 dark:text-emerald-300",
    glyph: "text-emerald-700 dark:text-emerald-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(5,150,105,0.12)] dark:border-emerald-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(52,211,153,0.20)]",
    ring: "focus-visible:ring-emerald-500",
  },
  amber: {
    container:
      "bg-gradient-to-b from-amber-50/90 via-amber-100/40 to-amber-100/70 text-amber-900 dark:bg-gradient-to-b dark:from-amber-500/20 dark:via-amber-500/10 dark:to-amber-500/5 dark:text-amber-300",
    glyph: "text-amber-700 dark:text-amber-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(217,119,6,0.12)] dark:border-amber-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(251,191,36,0.20)]",
    ring: "focus-visible:ring-amber-500",
  },
  rose: {
    container:
      "bg-gradient-to-b from-rose-50/90 via-rose-100/40 to-rose-100/70 text-rose-800 dark:bg-gradient-to-b dark:from-rose-500/20 dark:via-rose-500/10 dark:to-rose-500/5 dark:text-rose-300",
    glyph: "text-rose-700 dark:text-rose-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(225,29,72,0.12)] dark:border-rose-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(248,113,113,0.20)]",
    ring: "focus-visible:ring-rose-500",
  },
  indigo: {
    container:
      "bg-gradient-to-b from-indigo-50/90 via-indigo-100/40 to-indigo-100/70 text-indigo-800 dark:bg-gradient-to-b dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-indigo-500/5 dark:text-indigo-300",
    glyph: "text-indigo-700 dark:text-indigo-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(79,70,229,0.12)] dark:border-indigo-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(129,140,248,0.20)]",
    ring: "focus-visible:ring-indigo-500",
  },
  blue: {
    container:
      "bg-gradient-to-b from-blue-50/90 via-blue-100/40 to-blue-100/70 text-blue-800 dark:bg-gradient-to-b dark:from-blue-500/20 dark:via-blue-500/10 dark:to-blue-500/5 dark:text-sky-300",
    glyph: "text-blue-700 dark:text-sky-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(37,99,235,0.12)] dark:border-sky-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(56,189,248,0.20)]",
    ring: "focus-visible:ring-blue-500",
  },
  purple: {
    container:
      "bg-gradient-to-b from-purple-50/90 via-purple-100/40 to-purple-100/70 text-purple-800 dark:bg-gradient-to-b dark:from-purple-500/20 dark:via-purple-500/10 dark:to-purple-500/5 dark:text-purple-300",
    glyph: "text-purple-700 dark:text-purple-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(147,51,234,0.12)] dark:border-purple-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(192,132,252,0.20)]",
    ring: "focus-visible:ring-purple-500",
  },
  cyan: {
    container:
      "bg-gradient-to-b from-cyan-50/90 via-cyan-100/40 to-cyan-100/70 text-cyan-800 dark:bg-gradient-to-b dark:from-cyan-500/20 dark:via-cyan-500/10 dark:to-cyan-500/5 dark:text-cyan-300",
    glyph: "text-cyan-700 dark:text-cyan-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(8,145,178,0.12)] dark:border-cyan-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(34,211,238,0.20)]",
    ring: "focus-visible:ring-cyan-500",
  },
  orange: {
    container:
      "bg-gradient-to-b from-orange-50/90 via-orange-100/40 to-orange-100/70 text-orange-900 dark:bg-gradient-to-b dark:from-orange-500/20 dark:via-orange-500/10 dark:to-orange-500/5 dark:text-orange-300",
    glyph: "text-orange-700 dark:text-orange-300",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(234,88,12,0.12)] dark:border-orange-400/30 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(251,146,60,0.20)]",
    ring: "focus-visible:ring-orange-500",
  },
  slate: {
    container:
      "bg-gradient-to-b from-slate-50/90 via-slate-100/40 to-slate-100/70 text-slate-800 dark:bg-gradient-to-b dark:from-white/15 dark:via-white/8 dark:to-white/4 dark:text-slate-200",
    glyph: "text-slate-700 dark:text-slate-200",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9),0_4px_12px_-2px_rgba(51,65,85,0.08)] dark:border-white/20 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.15),0_0_12px_rgba(255,255,255,0.08)]",
    ring: "focus-visible:ring-slate-500",
  },
  neutral: {
    container:
      "bg-gradient-to-b from-white/95 via-slate-50/60 to-slate-100/70 text-slate-700 dark:bg-gradient-to-b dark:from-white/12 dark:via-white/6 dark:to-white/2 dark:text-slate-200",
    glyph: "text-slate-700 dark:text-slate-200",
    border:
      "border border-white/90 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.95),0_4px_12px_-2px_rgba(0,0,0,0.05)] dark:border-white/15 dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12),0_0_12px_rgba(255,255,255,0.05)]",
    ring: "focus-visible:ring-slate-400",
  },
};

const SIZE_MAP: Record<
  GlassSize,
  {
    container: string;
    icon: string;
    rounded: string;
  }
> = {
  xs: {
    container: "w-7 h-7",
    icon: "w-3.5 h-3.5",
    rounded: "rounded-lg",
  },
  sm: {
    container: "w-8 h-8",
    icon: "w-4 h-4",
    rounded: "rounded-lg",
  },
  md: {
    container: "w-10 h-10",
    icon: "w-5 h-5",
    rounded: "rounded-xl",
  },
  lg: {
    container: "w-12 h-12",
    icon: "w-6 h-6",
    rounded: "rounded-2xl",
  },
  xl: {
    container: "w-14 h-14",
    icon: "w-7 h-7",
    rounded: "rounded-2xl",
  },
};

export interface GlassIconProps {
  icon: React.ElementType;
  variant?: GlassVariant;
  size?: GlassSize;
  className?: string;
  ariaHidden?: boolean;
}

export const GlassIcon: React.FC<GlassIconProps> = ({
  icon: Icon,
  variant = "teal",
  size = "md",
  className = "",
  ariaHidden = true,
}) => {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.teal;
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      aria-hidden={ariaHidden}
      className={`relative inline-flex items-center justify-center shrink-0 ${s.container} ${s.rounded} ${v.container} ${v.border} select-none ${className}`}
    >
      {/* Specular Top Reflection / Highlight */}
      <span
        className="absolute inset-x-0 top-0 h-[40%] rounded-t-[inherit] bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Vector Glyph */}
      <Icon className={`relative z-10 ${s.icon} ${v.glyph}`} />
    </div>
  );
};

export interface GlassIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  variant?: GlassVariant;
  size?: GlassSize;
  label: string;
  active?: boolean;
}

export const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  icon: Icon,
  variant = "teal",
  size = "md",
  label,
  active = false,
  className = "",
  disabled,
  ...props
}) => {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.teal;
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center shrink-0 ${s.container} ${s.rounded} ${v.container} ${v.border} transition-all duration-200 focus-ring ${v.ring} ${
        disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer"
      } ${active ? "ring-2 ring-offset-2 ring-ledger-teal" : ""} ${className}`}
      {...props}
    >
      {/* Specular Highlight */}
      <span
        className="absolute inset-x-0 top-0 h-[40%] rounded-t-[inherit] bg-gradient-to-b from-white/70 via-white/20 to-transparent pointer-events-none group-hover:from-white/85"
        aria-hidden="true"
      />

      {/* Glyph */}
      <Icon className={`relative z-10 ${s.icon} ${v.glyph} transition-transform group-hover:scale-105`} />
    </button>
  );
};

// Map category names or token identifiers to appropriate Lucide icon & GlassVariant
const ICON_LOOKUP: Record<string, React.ElementType> = {
  "shopping-cart": ShoppingCart,
  cart: ShoppingCart,
  groceries: ShoppingCart,
  utensils: Utensils,
  food: Utensils,
  dining: Utensils,
  car: Car,
  transport: Car,
  transportation: Car,
  home: Home,
  housing: Home,
  rent: Home,
  zap: Zap,
  utilities: Zap,
  bills: Zap,
  banknote: Banknote,
  salary: Banknote,
  cash: Banknote,
  briefcase: Briefcase,
  freelance: Briefcase,
  work: Briefcase,
  "heart-pulse": HeartPulse,
  healthcare: HeartPulse,
  health: HeartPulse,
  film: Film,
  entertainment: Film,
  "shopping-bag": ShoppingBag,
  shopping: ShoppingBag,
  "trending-up": TrendingUp,
  investments: TrendingUp,
  coffee: Coffee,
  gift: Gift,
  book: Book,
  plane: Plane,
  travel: Plane,
  dumbbell: Dumbbell,
  gym: Dumbbell,
  wallet: Wallet,
  shield: Shield,
  receipt: Receipt,
  piechart: PieChart,
  barchart: BarChart3,
  sparkles: Sparkles,
  "more-horizontal": MoreHorizontal,
  tag: Tag,
};

export const CategoryGlassIcon: React.FC<{
  iconName?: string;
  colorToken?: string;
  size?: GlassSize;
  className?: string;
}> = ({ iconName = "tag", colorToken = "teal", size = "md", className = "" }) => {
  const normalizedIcon = (iconName || "tag").toLowerCase().trim();
  const IconComp = ICON_LOOKUP[normalizedIcon] || Tag;

  const validVariants: GlassVariant[] = [
    "teal",
    "emerald",
    "amber",
    "rose",
    "indigo",
    "blue",
    "purple",
    "cyan",
    "orange",
    "slate",
    "neutral",
  ];

  const variant: GlassVariant = validVariants.includes(colorToken as GlassVariant)
    ? (colorToken as GlassVariant)
    : "teal";

  return <GlassIcon icon={IconComp} variant={variant} size={size} className={className} />;
};
