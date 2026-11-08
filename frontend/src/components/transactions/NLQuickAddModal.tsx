import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  Camera,
  Paperclip,
  RotateCcw,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Receipt,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { CategoryItem, ParsedDraftItem, ReceiptExtractResponse } from "../../lib/api";
import {
  bulkCreateTransactions,
  createTransaction,
  extractReceipt,
  parseNaturalLanguage,
} from "../../lib/api";
import { formatINR, paiseToRupees, rupeesToPaise } from "../../lib/currency";
import { useToast } from "../common/Toast";
import { GlassIcon } from "../common/GlassIcon";

interface NLQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
}

export const NLQuickAddModal: React.FC<NLQuickAddModalProps> = ({ isOpen, onClose, categories }) => {
  const [mode, setMode] = useState<"nl" | "manual" | "camera" | "receipt_review">("nl");
  const [nlText, setNlText] = useState("");
  const [drafts, setDrafts] = useState<ParsedDraftItem[]>([]);
  const [isReviewed, setIsReviewed] = useState(false);

  // Manual form state
  const [manualAmount, setManualAmount] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCatId, setManualCatId] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualKind, setManualKind] = useState<"expense" | "income">("expense");

  // Camera capture state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement | null>(null);

  // Receipt review state
  const [isExtracting, setIsExtracting] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState<{
    file_id: string;
    file_name: string;
    file_size: number;
    merchant: string;
    amount_rupees: string;
    date: string;
    category_id: string;
    description: string;
    kind: "expense" | "income";
    notes: string;
    confidence_score: number;
    warnings: string[];
    subtotal_paise?: number | null;
    tax_paise?: number | null;
    line_items: Array<{ name: string; amount_paise: number }>;
  } | null>(null);
  const [showLineItems, setShowLineItems] = useState(false);

  const effectiveCatId = manualCatId || (categories.length > 0 ? categories[0].id : "");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Stop camera tracks cleanly
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup camera stream on unmount or close
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (capturedPhotoUrl) {
        URL.revokeObjectURL(capturedPhotoUrl);
      }
    };
  }, [capturedPhotoUrl]);

  // Start device camera
  const startCamera = async () => {
    setCapturedPhotoUrl(null);
    setCapturedFile(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("Web camera not supported in this browser. Please attach a photo instead.", "info");
      cameraFallbackInputRef.current?.click();
      return;
    }

    try {
      setMode("camera");
      // Prefer rear camera on mobile devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      stopCameraStream();
      toast("Camera permission denied or camera unavailable. Please upload a receipt file.", "info");
      // Trigger fallback file picker
      cameraFallbackInputRef.current?.click();
      setMode("nl");
    }
  };

  // Capture frame from active video stream
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCameraStream();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const photoUrl = URL.createObjectURL(blob);
        const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: "image/jpeg" });
        setCapturedPhotoUrl(photoUrl);
        setCapturedFile(file);
      },
      "image/jpeg",
      0.92
    );
  };

  // Process uploaded or captured receipt file
  const handleProcessReceipt = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast("Receipt file exceeds maximum 5MB limit. Please select a smaller file.", "error");
      return;
    }

    setIsExtracting(true);
    try {
      const data: ReceiptExtractResponse = await extractReceipt(file);

      // Determine best category ID
      let matchedCatId = data.suggested_category_id;
      if (!matchedCatId || !categories.some((c) => c.id === matchedCatId)) {
        matchedCatId = categories.length > 0 ? categories[0].id : "";
      }

      setReceiptDraft({
        file_id: data.file_id,
        file_name: data.file_name,
        file_size: data.file_size,
        merchant: data.merchant || "",
        amount_rupees: data.amount_paise ? paiseToRupees(data.amount_paise).toString() : "",
        date: data.date || new Date().toISOString().split("T")[0],
        category_id: matchedCatId,
        description: data.description || data.merchant || "Receipt Expense",
        kind: "expense",
        notes: data.notes || `Receipt scan: ${data.file_name}`,
        confidence_score: data.confidence_score,
        warnings: data.warnings,
        subtotal_paise: data.subtotal_paise,
        tax_paise: data.tax_paise,
        line_items: data.line_items || [],
      });

      setMode("receipt_review");
      toast("Receipt details extracted! Please review and confirm before saving.", "success");
    } catch (err: any) {
      toast(err.message || "Failed to process receipt file.", "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessReceipt(file);
    }
    // Reset input so same file can be re-selected if needed
    e.target.value = "";
  };

  // Parse NL text mutation
  const parseMutation = useMutation({
    mutationFn: parseNaturalLanguage,
    onSuccess: (data) => {
      if (data.drafts.length === 0) {
        toast("No financial amounts detected. Try typing: '₹120 milk today'", "info");
        return;
      }
      const enrichedDrafts = data.drafts.map((d) => {
        let catId = d.category_id;
        if (!catId) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === d.category_name.toLowerCase()
          );
          catId = match ? match.id : categories[0]?.id;
        }
        return { ...d, category_id: catId };
      });
      setDrafts(enrichedDrafts);
      setIsReviewed(true);
    },
    onError: (err: any) => {
      toast(err.message || "Failed to parse text", "error");
    },
  });

  // Save bulk drafts mutation
  const bulkSaveMutation = useMutation({
    mutationFn: bulkCreateTransactions,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast(`Successfully confirmed & saved ${saved.length} transaction(s) to ledger!`, "success");
      handleClose();
    },
    onError: (err: any) => {
      toast(err.message || "Bulk save failed", "error");
    },
  });

  // Manual & Receipt save mutation
  const saveTransactionMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthlySummary"] });
      queryClient.invalidateQueries({ queryKey: ["budgetPace"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["anomalies"] });
      toast("Transaction verified and recorded in ledger", "success");
      handleClose();
    },
    onError: (err: any) => {
      toast(err.message || "Failed to save transaction", "error");
    },
  });

  const handleClose = () => {
    stopCameraStream();
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl(null);
    }
    setCapturedFile(null);
    setReceiptDraft(null);
    setNlText("");
    setDrafts([]);
    setIsReviewed(false);
    setManualAmount("");
    setManualDesc("");
    setMode("nl");
    onClose();
  };

  const handleParseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlText.trim()) return;
    parseMutation.mutate(nlText);
  };

  const handleUpdateDraft = (index: number, field: keyof ParsedDraftItem, value: any) => {
    setDrafts((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };
      if (field === "amount_rupees") {
        const paise = rupeesToPaise(Number(value) || 0);
        target.amount_paise = paise;
        target.formatted_amount = formatINR(paise);
      }
      next[index] = target;
      return next;
    });
  };

  const handleDeleteDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    if (drafts.length <= 1) {
      setIsReviewed(false);
    }
  };

  const handleConfirmBulkSave = () => {
    if (drafts.length === 0) return;
    const payload = drafts.map((d) => ({
      category_id: d.category_id || categories[0].id,
      kind: d.kind,
      amount_paise: d.amount_paise,
      occurred_on: d.occurred_on,
      description: d.description,
      source: "nl" as const,
      nl_original_text: d.nl_original_text,
    }));
    bulkSaveMutation.mutate(payload);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(Number(manualAmount));
    if (!paise || paise <= 0) {
      toast("Please enter a valid amount in Rupees", "error");
      return;
    }
    if (!manualDesc.trim()) {
      toast("Please enter a description", "error");
      return;
    }
    saveTransactionMutation.mutate({
      category_id: effectiveCatId,
      kind: manualKind,
      amount_paise: paise,
      occurred_on: manualDate,
      description: manualDesc.trim(),
      source: "manual",
    });
  };

  const handleReceiptReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptDraft) return;

    const paise = rupeesToPaise(Number(receiptDraft.amount_rupees));
    if (!paise || paise <= 0) {
      toast("Please specify a valid total amount in Rupees", "error");
      return;
    }
    if (!receiptDraft.description.trim()) {
      toast("Please provide a description or merchant name", "error");
      return;
    }

    saveTransactionMutation.mutate({
      category_id: receiptDraft.category_id,
      kind: receiptDraft.kind,
      amount_paise: paise,
      occurred_on: receiptDraft.date,
      description: receiptDraft.description.trim(),
      merchant: receiptDraft.merchant.trim() || undefined,
      note: receiptDraft.notes.trim() || undefined,
      source: "manual",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in overflow-hidden">
      <div className="bg-white dark:bg-[#121C28] backdrop-blur-2xl max-w-2xl w-full rounded-2xl sm:rounded-3xl border border-ledger-border shadow-float overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[92vh]">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraFallbackInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Header with Mode Toggle & Action Title */}
        <div className="flex items-center justify-between p-5 border-b border-ledger-border bg-ledger-surfaceSubtle">
          <div className="flex items-center gap-2.5">
            <GlassIcon
              icon={mode === "receipt_review" || mode === "camera" ? Receipt : Sparkles}
              variant="teal"
              size="sm"
            />
            <div>
              <h2 className="font-serif text-lg font-bold text-ledger-ink">
                {mode === "receipt_review" ? "Review Receipt Extraction" : mode === "camera" ? "Scan Receipt" : "Add Transaction"}
              </h2>
              <p className="text-xs text-ledger-inkMuted">
                {mode === "receipt_review"
                  ? "Verify extracted details before saving to ledger"
                  : mode === "camera"
                  ? "Capture live receipt using webcam or mobile rear camera"
                  : "Quick AI parsing, camera scan, or manual form"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode !== "camera" && mode !== "receipt_review" && (
              <div className="flex bg-ledger-bg p-0.5 rounded-lg border border-ledger-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode("nl")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    mode === "nl"
                      ? "bg-ledger-surface text-ledger-teal font-semibold shadow-hairline"
                      : "text-ledger-inkMuted hover:text-ledger-ink"
                  }`}
                >
                  Natural Language
                </button>
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    mode === "manual"
                      ? "bg-ledger-surface text-ledger-teal font-semibold shadow-hairline"
                      : "text-ledger-inkMuted hover:text-ledger-ink"
                  }`}
                >
                  Manual Form
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="text-ledger-inkSubtle hover:text-ledger-ink p-1 rounded-lg focus-ring"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-4 sm:space-y-5 flex-1">
          {/* Extracting Loading Overlay */}
          {isExtracting && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-ledger-teal" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ledger-ink">Analyzing receipt & document...</p>
                <p className="text-xs text-ledger-inkMuted">Extracting vendor, date, line items & amounts with ₹0 local intelligence</p>
              </div>
            </div>
          )}

          {/* Mode 1: Camera Scanner View */}
          {!isExtracting && mode === "camera" && (
            <div className="space-y-4">
              {!capturedPhotoUrl ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] max-h-80 flex items-center justify-center border border-ledger-border">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Target Guidelines */}
                    <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-ledger-teal/70 rounded-xl pointer-events-none flex items-center justify-center">
                      <span className="text-[11px] font-medium text-white/80 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        Position receipt within frame
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        setMode("nl");
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={captureFrame}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ledger-teal text-white text-sm font-semibold hover:bg-ledger-tealHover shadow-sm"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Captured Photo Confirmation */
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[4/3] max-h-80 border border-ledger-border">
                    <img
                      src={capturedPhotoUrl}
                      alt="Captured receipt"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (capturedFile) {
                          handleProcessReceipt(capturedFile);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ledger-teal text-white text-sm font-semibold hover:bg-ledger-tealHover shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>Use Photo & Extract</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Receipt Review Step (Before Committing to Ledger) */}
          {!isExtracting && mode === "receipt_review" && receiptDraft && (
            <form onSubmit={handleReceiptReviewSubmit} className="space-y-4">
              {/* Receipt File Metadata Card */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-ledger-surface border border-ledger-border flex items-center justify-between gap-2 overflow-hidden">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-ledger-teal/10 text-ledger-teal flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ledger-ink truncate" title={receiptDraft.file_name}>
                      {receiptDraft.file_name}
                    </p>
                    <p className="text-[11px] text-ledger-inkMuted truncate">
                      {(receiptDraft.file_size / 1024).toFixed(1)} KB • Attached
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    <span>{Math.round(receiptDraft.confidence_score * 100)}% Match</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptDraft(null);
                      setMode("nl");
                    }}
                    className="text-xs text-ledger-inkMuted hover:text-ledger-red transition-colors px-1 py-1"
                    title="Remove attachment"
                  >
                    Replace
                  </button>
                </div>
              </div>

              {receiptDraft.warnings.length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{receiptDraft.warnings[0]}</span>
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Merchant / Vendor
                  </label>
                  <input
                    type="text"
                    value={receiptDraft.merchant}
                    onChange={(e) =>
                      setReceiptDraft({
                        ...receiptDraft,
                        merchant: e.target.value,
                        description: e.target.value || receiptDraft.description,
                      })
                    }
                    placeholder="e.g. Starbucks, D-Mart, Amazon"
                    className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink text-sm focus-ring"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Total Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-ledger-inkSubtle text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={receiptDraft.amount_rupees}
                      onChange={(e) =>
                        setReceiptDraft({ ...receiptDraft, amount_rupees: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink font-semibold tabular-nums text-sm focus-ring"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={receiptDraft.category_id}
                    onChange={(e) =>
                      setReceiptDraft({ ...receiptDraft, category_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink text-sm focus-ring"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.kind})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={receiptDraft.date}
                    onChange={(e) =>
                      setReceiptDraft({ ...receiptDraft, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink text-sm focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={receiptDraft.description}
                  onChange={(e) =>
                    setReceiptDraft({ ...receiptDraft, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink text-sm focus-ring"
                />
              </div>

              {/* Detected Subtotal & Tax Breakdowns (if available) */}
              {(receiptDraft.subtotal_paise || receiptDraft.tax_paise) && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ledger-inkSubtle bg-ledger-surfaceSubtle/50 border border-ledger-border/50 rounded-xl p-2.5">
                  {receiptDraft.subtotal_paise && (
                    <span>Subtotal: <strong className="text-ledger-ink font-semibold">{formatINR(receiptDraft.subtotal_paise)}</strong></span>
                  )}
                  {receiptDraft.subtotal_paise && receiptDraft.tax_paise && <span>•</span>}
                  {receiptDraft.tax_paise && (
                    <span>Taxes (GST): <strong className="text-ledger-ink font-semibold">{formatINR(receiptDraft.tax_paise)}</strong></span>
                  )}
                </div>
              )}

              {/* Detected Line Items (Optional Collapsible) */}
              {receiptDraft.line_items.length > 0 && (
                <div className="border border-ledger-border rounded-xl p-3 bg-ledger-surfaceSubtle space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowLineItems(!showLineItems)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-ledger-inkMuted hover:text-ledger-ink"
                  >
                    <span>Detected Line Items ({receiptDraft.line_items.length})</span>
                    {showLineItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showLineItems && (
                    <div className="space-y-1.5 pt-1 border-t border-ledger-border/60">
                      {receiptDraft.line_items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-ledger-ink py-0.5">
                          <span className="truncate pr-2">{item.name}</span>
                          <span className="font-semibold tabular-nums text-ledger-inkMuted">
                            {formatINR(item.amount_paise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-ledger-border gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReceiptDraft(null);
                    setMode("nl");
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border min-h-[44px]"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saveTransactionMutation.isPending}
                  className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-ledger-teal text-white text-xs font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring min-h-[44px]"
                >
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {saveTransactionMutation.isPending ? "Recording..." : "Save Transaction to Ledger"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Mode 3: Natural Language Mode */}
          {!isExtracting && mode === "nl" && (
            <>
              {!isReviewed ? (
                <form onSubmit={handleParseSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1.5">
                      Type what you spent in plain Indian English
                    </label>
                    <textarea
                      value={nlText}
                      onChange={(e) => setNlText(e.target.value)}
                      placeholder="e.g. ₹120 milk and ₹450 groceries today, auto 80 yesterday"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink placeholder:text-ledger-inkSubtle focus-ring resize-none text-sm leading-relaxed"
                      autoFocus
                    />
                  </div>

                  {/* Attachment & Camera Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-ledger-surface border border-ledger-border">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ledger-border bg-ledger-bg hover:border-ledger-teal/50 text-xs font-medium text-ledger-ink transition-colors"
                        title="Upload receipt image, PDF, or document (max 5MB)"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-ledger-teal" />
                        <span>Upload Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={startCamera}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ledger-border bg-ledger-bg hover:border-ledger-teal/50 text-xs font-medium text-ledger-ink transition-colors"
                        title="Scan with device webcam or phone rear camera"
                      >
                        <Camera className="w-3.5 h-3.5 text-ledger-teal" />
                        <span>Scan Camera</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-ledger-inkSubtle">
                      PDF, PNG, JPG, WebP (≤5MB)
                    </span>
                  </div>

                  {/* Quick Examples */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-ledger-inkSubtle font-medium">Try clicking an example:</span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        "₹120 milk and ₹450 groceries today, auto 80 yesterday",
                        "Swiggy 380 dinner last night",
                        "1.5k shopping at Zara",
                        "Rs 2500 wifi bill today",
                      ].map((ex) => (
                        <button
                          type="button"
                          key={ex}
                          onClick={() => setNlText(ex)}
                          className="px-2.5 py-1 rounded-lg bg-ledger-bg border border-ledger-border hover:border-ledger-teal/50 text-ledger-inkMuted hover:text-ledger-ink transition-colors text-left"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!nlText.trim() || parseMutation.isPending}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ledger-teal text-white text-sm font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring"
                    >
                      {parseMutation.isPending ? "Parsing..." : "Parse & Review"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                /* Review-Before-Save Drafts Table */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ledger-ink">
                        Review Parsed Drafts ({drafts.length})
                      </h3>
                      <p className="text-xs text-ledger-inkMuted">
                        Verify and edit items before committing to the ledger.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReviewed(false)}
                      className="text-xs text-ledger-teal hover:underline font-medium"
                    >
                      ← Re-edit text
                    </button>
                  </div>

                  <div className="border border-ledger-border rounded-xl overflow-hidden bg-ledger-surface">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-ledger-bg border-b border-ledger-border text-ledger-inkMuted uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Amount (₹)</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ledger-border">
                        {drafts.map((draft, idx) => (
                          <tr key={idx} className="hover:bg-ledger-surfaceSubtle transition-colors">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={draft.description}
                                onChange={(e) => handleUpdateDraft(idx, "description", e.target.value)}
                                className="w-full bg-transparent border-b border-transparent hover:border-ledger-border focus:border-ledger-teal px-1 py-0.5 focus-ring rounded"
                              />
                              {draft.needs_review && (
                                <span className="inline-block mt-0.5 text-[10px] text-ledger-amber font-semibold">
                                  ⚠ Review category
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 w-28">
                              <div className="relative">
                                <span className="absolute left-1.5 top-1 text-ledger-inkSubtle">₹</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={draft.amount_rupees || paiseToRupees(draft.amount_paise)}
                                  onChange={(e) => handleUpdateDraft(idx, "amount_rupees", e.target.value)}
                                  className="w-full pl-5 pr-1 py-0.5 bg-transparent border-b border-transparent hover:border-ledger-border focus:border-ledger-teal tabular-nums font-semibold focus-ring rounded"
                                />
                              </div>
                            </td>
                            <td className="py-2 px-3 w-36">
                              <select
                                value={draft.category_id}
                                onChange={(e) => {
                                  const selectedCat = categories.find((c) => c.id === e.target.value);
                                  handleUpdateDraft(idx, "category_id", e.target.value);
                                  if (selectedCat) {
                                    handleUpdateDraft(idx, "category_name", selectedCat.name);
                                    handleUpdateDraft(idx, "needs_review", false);
                                  }
                                }}
                                className="w-full bg-transparent border border-ledger-border rounded px-1.5 py-1 text-xs focus-ring"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 w-32">
                              <input
                                type="date"
                                value={draft.occurred_on}
                                onChange={(e) => handleUpdateDraft(idx, "occurred_on", e.target.value)}
                                className="w-full bg-transparent border border-ledger-border rounded px-1 py-0.5 text-xs focus-ring"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteDraft(idx)}
                                className="text-ledger-inkSubtle hover:text-ledger-red p-1 rounded focus-ring"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-ledger-inkMuted">
                      Total:{" "}
                      <span className="font-serif font-bold text-ledger-ink text-sm tabular-nums">
                        {formatINR(drafts.reduce((sum, d) => sum + d.amount_paise, 0))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border focus-ring"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmBulkSave}
                        disabled={bulkSaveMutation.isPending || drafts.length === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ledger-teal text-white text-xs font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring"
                      >
                        <Check className="w-4 h-4" />
                        <span>{bulkSaveMutation.isPending ? "Saving..." : `Confirm & Add (${drafts.length})`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Mode 4: Manual Form */}
          {!isExtracting && mode === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Attachment Bar in Manual Form */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-ledger-surface border border-ledger-border">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ledger-border bg-ledger-bg hover:border-ledger-teal/50 text-xs font-medium text-ledger-ink transition-colors"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-ledger-teal" />
                    <span>Upload Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ledger-border bg-ledger-bg hover:border-ledger-teal/50 text-xs font-medium text-ledger-ink transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-ledger-teal" />
                    <span>Scan Camera</span>
                  </button>
                </div>

                <span className="text-[11px] text-ledger-inkSubtle">
                  PDF, PNG, JPG, WebP (≤5MB)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-ledger-inkSubtle text-sm">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      placeholder="e.g. 450.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink font-semibold tabular-nums focus-ring text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Type
                  </label>
                  <select
                    value={manualKind}
                    onChange={(e) => setManualKind(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="e.g. Organic Milk and Eggs"
                  className="w-full px-4 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={manualCatId}
                    onChange={(e) => setManualCatId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.kind})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ledger-inkMuted uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink focus-ring text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-ledger-inkMuted hover:text-ledger-ink border border-ledger-border focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveTransactionMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ledger-teal text-white text-xs font-semibold hover:bg-ledger-tealHover disabled:opacity-50 transition-colors shadow-sm focus-ring"
                >
                  <Plus className="w-4 h-4" />
                  <span>{saveTransactionMutation.isPending ? "Recording..." : "Record Transaction"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
