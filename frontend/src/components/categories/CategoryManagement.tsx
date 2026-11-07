import React, { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Search,
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
  AlertTriangle,
  X,
  Check,
} from "lucide-react";
import type { CategoryItem } from "../../lib/api";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  archiveCategory,
} from "../../lib/api";
import { useToast } from "../common/Toast";
import { GlassIcon } from "../common/GlassIcon";

const AVAILABLE_ICONS: Array<{ id: string; label: string; icon: React.ElementType }> = [
  { id: "shopping-cart", label: "Groceries / Cart", icon: ShoppingCart },
  { id: "utensils", label: "Dining / Food", icon: Utensils },
  { id: "car", label: "Transportation", icon: Car },
  { id: "home", label: "Housing / Rent", icon: Home },
  { id: "zap", label: "Utilities / Bills", icon: Zap },
  { id: "heart-pulse", label: "Healthcare", icon: HeartPulse },
  { id: "film", label: "Entertainment", icon: Film },
  { id: "shopping-bag", label: "Shopping", icon: ShoppingBag },
  { id: "banknote", label: "Salary / Cash", icon: Banknote },
  { id: "trending-up", label: "Investments", icon: TrendingUp },
  { id: "briefcase", label: "Work / Freelance", icon: Briefcase },
  { id: "coffee", label: "Coffee / Drinks", icon: Coffee },
  { id: "gift", label: "Gifts / Donations", icon: Gift },
  { id: "book", label: "Education / Books", icon: Book },
  { id: "plane", label: "Travel / Flights", icon: Plane },
  { id: "dumbbell", label: "Fitness / Gym", icon: Dumbbell },
  { id: "wallet", label: "Savings / Wallet", icon: Wallet },
  { id: "shield", label: "Insurance / Security", icon: Shield },
  { id: "more-horizontal", label: "Other / Misc", icon: MoreHorizontal },
  { id: "tag", label: "General Tag", icon: Tag },
];

const COLOR_TOKENS: Array<{ id: string; label: string; bg: string; text: string; ring: string }> = [
  { id: "emerald", label: "Emerald", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-ledger-sage", ring: "ring-emerald-500" },
  { id: "teal", label: "Teal", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-ledger-teal", ring: "ring-teal-500" },
  { id: "cyan", label: "Cyan", bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-400", ring: "ring-cyan-500" },
  { id: "blue", label: "Blue", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400", ring: "ring-blue-500" },
  { id: "indigo", label: "Indigo", bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-400", ring: "ring-indigo-500" },
  { id: "purple", label: "Purple", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400", ring: "ring-purple-500" },
  { id: "rose", label: "Rose", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-ledger-red", ring: "ring-rose-500" },
  { id: "amber", label: "Amber", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-ledger-amber", ring: "ring-amber-500" },
  { id: "orange", label: "Orange", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-400", ring: "ring-orange-500" },
  { id: "slate", label: "Slate", bg: "bg-slate-100 dark:bg-ledger-surfaceElevated", text: "text-slate-700 dark:text-ledger-muted", ring: "ring-slate-500" },
];

function getCategoryIcon(iconName: string): React.ElementType {
  const match = AVAILABLE_ICONS.find((item) => item.id === iconName);
  return match ? match.icon : Tag;
}

export const CategoryManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [archivingCategory, setArchivingCategory] = useState<CategoryItem | null>(null);

  // Form states for Create
  const [createName, setCreateName] = useState<string>("");
  const [createKind, setCreateKind] = useState<"expense" | "income">("expense");
  const [createIcon, setCreateIcon] = useState<string>("tag");
  const [createColor, setCreateColor] = useState<string>("teal");

  // Form states for Edit
  const [editName, setEditName] = useState<string>("");
  const [editIcon, setEditIcon] = useState<string>("tag");
  const [editColor, setEditColor] = useState<string>("teal");

  // Fetch categories query
  const {
    data: categories = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories", includeArchived],
    queryFn: () => fetchCategories(includeArchived),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast(`Category "${newCat.name}" created successfully.`, "success");
      setIsCreateOpen(false);
      setCreateName("");
      setCreateIcon("tag");
      setCreateColor("teal");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to create category", "error");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCategory(id, data),
    onSuccess: (updatedCat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast(`Category "${updatedCat.name}" updated successfully.`, "success");
      setEditingCategory(null);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to update category", "error");
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast("Category archived successfully.", "success");
      setArchivingCategory(null);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to archive category", "error");
    },
  });

  // Restore mutation (unarchive)
  const restoreMutation = useMutation({
    mutationFn: (id: string) => updateCategory(id, { is_archived: false }),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast(`Category "${cat.name}" restored successfully.`, "success");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to restore category", "error");
    },
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.kind !== activeTab) return false;
      if (searchQuery.trim()) {
        return c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return true;
    });
  }, [categories, activeTab, searchQuery]);

  const expenseCount = useMemo(
    () => categories.filter((c) => c.kind === "expense").length,
    [categories]
  );
  const incomeCount = useMemo(
    () => categories.filter((c) => c.kind === "income").length,
    [categories]
  );

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon || "tag");
    setEditColor(cat.color_token || "teal");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    updateMutation.mutate({
      id: editingCategory.id,
      data: {
        name: editingCategory.is_default ? undefined : editName.trim(),
        icon: editIcon,
        color_token: editColor,
      },
    });
  };

  const handleOpenCreate = () => {
    setCreateKind(activeTab);
    setCreateName("");
    setCreateIcon(activeTab === "income" ? "banknote" : "tag");
    setCreateColor(activeTab === "income" ? "emerald" : "teal");
    setIsCreateOpen(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast("Category name is required", "error");
      return;
    }
    createMutation.mutate({
      name: createName.trim(),
      kind: createKind,
      icon: createIcon,
      color_token: createColor,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Category Management
          </h1>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">
            Organize your income and expense categories, customize icons, and manage classification rules with strict multi-tenant isolation.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-primary flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-sm focus-ring shrink-0 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New Category</span>
        </button>
      </div>

      {/* Control Bar: Tabs, Search, and Archive Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Expense vs Income Segmented Switch */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("expense")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all min-h-[38px] ${
              activeTab === "expense"
                ? "bg-white dark:bg-[#121C28] text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-white/10 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            } focus-ring cursor-pointer`}
          >
            <span>Expense Categories</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
              {expenseCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("income")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all min-h-[38px] ${
              activeTab === "income"
                ? "bg-white dark:bg-[#121C28] text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200 dark:border-white/10 font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            } focus-ring cursor-pointer`}
          >
            <span>Income Categories</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
              {incomeCount}
            </span>
          </button>
        </div>

        {/* Search & Show Archived Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab} categories...`}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121C28] text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus-ring min-h-[40px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer select-none px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-ledger-teal focus:ring-ledger-teal w-4 h-4"
            />
            <span>Show Archived</span>
          </label>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="h-28 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200">
          <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold">Failed to load categories</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Please check your network connection or try refreshing the page.
          </p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121C28] shadow-card">
          <Tag className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {searchQuery ? "No matching categories" : `No ${activeTab} categories found`}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto font-medium">
            {searchQuery
              ? `No category matches "${searchQuery}". Clear your search or create a new custom category.`
              : `Create custom ${activeTab} categories to organize your financial records.`}
          </p>
          <button
            onClick={handleOpenCreate}
            className="btn-primary mt-4 text-xs min-h-[38px] px-3.5 py-1.5 inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create {activeTab === "expense" ? "Expense" : "Income"} Category</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);

            const hasActiveBudget = Boolean(cat.has_active_budget);
            const isArchived = Boolean(cat.is_archived);
            const isDefault = Boolean(cat.is_default);
            const txCount = cat.transaction_count || 0;

            return (
              <div
                key={cat.id}
                className={`flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card transition-all ${
                  isArchived
                    ? "opacity-60"
                    : "hover:border-slate-400 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <GlassIcon
                      icon={Icon}
                      variant={cat.color_token as any || "teal"}
                      size="md"
                      className="shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {cat.name}
                        </h3>
                        {isDefault && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            title="Default system category (preserved from deletion)"
                          >
                            Default
                          </span>
                        )}
                        {isArchived && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                            Archived
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono font-medium">
                        <span>{txCount} {txCount === 1 ? "entry" : "entries"}</span>
                        {hasActiveBudget && (
                          <>
                            <span>•</span>
                            <span className="text-teal-700 dark:text-teal-400 font-semibold font-sans">Active Budget</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center focus-ring cursor-pointer shadow-xs"
                      title="Edit category"
                      aria-label={`Edit category ${cat.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => restoreMutation.mutate(cat.id)}
                        disabled={restoreMutation.isPending}
                        className="p-1.5 text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-200 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center focus-ring cursor-pointer shadow-xs"
                        title="Restore archived category"
                        aria-label={`Restore category ${cat.name}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isDefault) {
                            toast("Default categories cannot be archived.", "info");
                            return;
                          }
                          if (hasActiveBudget) {
                            toast(
                              "Cannot archive category with active budget. Please remove or zero the budget limit first.",
                              "error"
                            );
                            return;
                          }
                          setArchivingCategory(cat);
                        }}
                        disabled={isDefault || hasActiveBudget}
                        className={`p-1.5 rounded-lg transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center focus-ring shadow-xs ${
                          isDefault || hasActiveBudget
                            ? "text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 cursor-not-allowed"
                            : "text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100/70 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/60 cursor-pointer"
                        }`}
                        title={
                          isDefault
                            ? "Default system categories are preserved and cannot be archived"
                            : hasActiveBudget
                            ? "Cannot archive category with active monthly budget"
                            : "Archive category"
                        }
                        aria-label={`Archive category ${cat.name}`}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
        >
          <div className="bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 rounded-2xl shadow-modal max-w-md w-full p-6 text-slate-900 dark:text-slate-100 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h2 id="create-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Create New Category
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateKind("expense");
                      setCreateColor("teal");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all min-h-[42px] cursor-pointer ${
                      createKind === "expense"
                        ? "bg-ledger-teal text-white border-ledger-teal shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateKind("income");
                      setCreateColor("emerald");
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all min-h-[42px] cursor-pointer ${
                      createKind === "income"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Pet Care, OTT Subscriptions, Freelance"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#121C28] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-ring min-h-[44px]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = createIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCreateIcon(item.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all min-h-[44px] cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400 dark:bg-white dark:text-slate-900 dark:border-white"
                            : "bg-white dark:bg-[#121C28] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Color Accent
                </label>
                <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {COLOR_TOKENS.map((c) => {
                    const isSelected = createColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCreateColor(c.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          c.bg
                        } ${c.text} border border-current/30 cursor-pointer ${
                          isSelected ? `ring-2 ring-offset-2 ${c.ring}` : "hover:scale-105"
                        }`}
                        title={c.label}
                        aria-label={`Select ${c.label} color`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[42px] focus-ring cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !createName.trim()}
                  className="btn-primary px-5 py-2 text-xs font-semibold min-h-[42px] focus-ring inline-flex items-center gap-2 cursor-pointer"
                >
                  {createMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Create Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
        >
          <div className="bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 rounded-2xl shadow-modal max-w-md w-full p-6 text-slate-900 dark:text-slate-100 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h2 id="edit-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Edit Category
              </h2>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  disabled={editingCategory.is_default}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                    editingCategory.is_default
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed"
                      : "bg-white dark:bg-[#121C28] text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus-ring"
                  } min-h-[44px]`}
                />
                {editingCategory.is_default && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                    Default system category names cannot be renamed to preserve financial consistency. You can still customize its icon and color.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = editIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditIcon(item.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all min-h-[44px] cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400 dark:bg-white dark:text-slate-900 dark:border-white"
                            : "bg-white dark:bg-[#121C28] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Color Accent
                </label>
                <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  {COLOR_TOKENS.map((c) => {
                    const isSelected = editColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditColor(c.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          c.bg
                        } ${c.text} border border-current/30 cursor-pointer ${
                          isSelected ? `ring-2 ring-offset-2 ${c.ring}` : "hover:scale-105"
                        }`}
                        title={c.label}
                        aria-label={`Select ${c.label} color`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[42px] focus-ring cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending || (!editingCategory.is_default && !editName.trim())}
                  className="btn-primary px-5 py-2 text-xs font-semibold min-h-[42px] focus-ring inline-flex items-center gap-2 cursor-pointer"
                >
                  {updateMutation.isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archivingCategory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
        >
          <div className="bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 rounded-2xl shadow-modal max-w-md w-full p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800/40">
              <Archive className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h2 id="archive-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Archive "{archivingCategory.name}"?
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Archiving hides this category from new transaction and budget pickers.
                {archivingCategory.transaction_count && archivingCategory.transaction_count > 0 ? (
                  <span className="block mt-2 font-semibold text-slate-800 dark:text-slate-200">
                    Existing {archivingCategory.transaction_count} transaction records will be safely preserved in your ledger history.
                  </span>
                ) : (
                  <span className="block mt-2 font-semibold text-slate-800 dark:text-slate-200">
                    This category is currently unused and can be restored at any time.
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setArchivingCategory(null)}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[42px] focus-ring cursor-pointer"
              >
                Keep Category
              </button>
              <button
                type="button"
                onClick={() => archiveMutation.mutate(archivingCategory.id)}
                disabled={archiveMutation.isPending}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white min-h-[42px] focus-ring inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                {archiveMutation.isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
