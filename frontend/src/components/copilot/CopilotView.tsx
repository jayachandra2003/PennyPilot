import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  FileText,
  Bot,
  User as UserIcon,
  RefreshCw,
  BarChart2,
  ShieldAlert,
  Target,
  Mic,
  MicOff,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EvidencePanel } from "./EvidencePanel";
import { MonthlyReportModal } from "./MonthlyReportModal";
import {
  askCopilot,
  fetchAIProviderStatus,
  fetchMonthlyReport,
  type CopilotQueryResponse,
  type MonthlyReportResponse,
} from "../../lib/api";
import { GlassIcon } from "../common/GlassIcon";
import { useVoiceInput } from "../../hooks/useVoiceInput";

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  responseMeta?: CopilotQueryResponse;
}

interface CopilotViewProps {
  year: number;
  month: number;
  onNavigateTab?: (tab: string, section?: string) => void;
  onOpenQuickAdd?: () => void;
}

interface PromptGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  prompts: string[];
}

const PROMPT_GROUPS: PromptGroup[] = [
  {
    id: "spending",
    label: "Spending & Cutbacks",
    icon: BarChart2,
    prompts: [
      "Where do I need to reduce my spending?",
      "Why did my expenses increase this month?",
      "Which category consumes most of my income?",
    ],
  },
  {
    id: "savings",
    label: "Savings & Performance",
    icon: Target,
    prompts: [
      "Am I good at saving money?",
      "How can I improve my savings rate?",
      "How much did I save this month?",
    ],
  },
  {
    id: "budget",
    label: "Budget & Pacing",
    icon: ShieldAlert,
    prompts: [
      "Am I on track with my monthly budget?",
      "Which transactions look unusual?",
      "Can I afford extra spending this month?",
    ],
  },
];

/**
 * Lightweight deterministic markdown formatter:
 * Strips raw '**' formatting characters and renders real <strong>, lists, and line breaks.
 */
function renderFormattedMessage(text: string) {
  if (!text) return null;
  const paragraphs = text.split("\n\n");

  return paragraphs.map((para, pIdx) => {
    const lines = para.split("\n");
    return (
      <div key={pIdx} className="mb-2 last:mb-0 leading-relaxed text-xs sm:text-sm">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
          const lineText = isBullet ? trimmed.replace(/^[•\-\*]\s+/, "") : trimmed;

          // Parse **bold** and *italic*
          const parts = lineText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
          const renderedParts = parts.map((part, idx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={idx} className="font-bold text-slate-900 dark:text-slate-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith("*") && part.endsWith("*")) {
              return (
                <em key={idx} className="italic text-slate-700 dark:text-slate-300">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return part;
          });

          if (isBullet) {
            return (
              <div key={lIdx} className="flex items-start gap-2 my-1 pl-1">
                <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0 mt-0.5">•</span>
                <span className="flex-1">{renderedParts}</span>
              </div>
            );
          }

          return (
            <React.Fragment key={lIdx}>
              {renderedParts}
              {lIdx < lines.length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </div>
    );
  });
}

export const CopilotView: React.FC<CopilotViewProps> = ({
  year,
  month,
  onNavigateTab,
  onOpenQuickAdd,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Welcome to PennyPilot Financial Intelligence. I analyze your verified ledger with zero arithmetic hallucination. Ask me about spending cutbacks, your savings performance, category allocations, or unusual outlier transactions.",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState<MonthlyReportResponse | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeGroupTab, setActiveGroupTab] = useState<string>("spending");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hook for voice speech recognition
  const handleVoiceTranscript = (text: string) => {
    setInputText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const {
    isListening,
    isSupported: isVoiceSupported,
    error: voiceError,
    startListening,
    stopListening,
    clearError: clearVoiceError,
  } = useVoiceInput(handleVoiceTranscript);

  // AI Provider Status Query
  const { data: aiStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["aiStatus"],
    queryFn: fetchAIProviderStatus,
    staleTime: 60000,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isSubmitting) return;

    if (isListening) {
      stopListening();
    }

    setErrorMessage(null);
    const userMsgId = `user_${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: "user",
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(newMessages);
    setInputText("");
    setIsSubmitting(true);

    try {
      const resp = await askCopilot(textToSend, year, month);
      setMessages((prev) => [
        ...prev,
        {
          id: `copilot_${Date.now()}`,
          sender: "copilot",
          text: resp.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          responseMeta: resp,
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to communicate with AI Copilot. Falling back to rule-based financial analysis.");
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          sender: "copilot",
          text: `⚠️ ${err.message || "Could not retrieve answer. Please try again."}`,
          timestamp: "Just now",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReport = async () => {
    setIsReportOpen(true);
    setIsReportLoading(true);
    try {
      const data = await fetchMonthlyReport(year, month);
      setReportData(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate report.");
    } finally {
      setIsReportLoading(false);
    }
  };

  const isCopilotOnline = Boolean(aiStatus?.active_provider);

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto animate-fade-in pb-6 min-w-0">
      {/* 1. Header & AI Provider Status Bar (Cleaned - Removed Redundant Uppercase Label) */}
      <div className="bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card p-5 sm:p-6 space-y-4 min-w-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 dark:border-white/5 pb-4 min-w-0">
          <div>
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>Financial AI Copilot</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold">
                FactBundle Grounded
              </span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Deterministic financial calculations paired with contextual AI explanations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            {/* Active AI Status Pill */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 select-none shadow-xs"
              title={isCopilotOnline ? `Active Tier: ${aiStatus?.display_name || "Online"}` : "Connecting to Copilot..."}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isCopilotOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
              <span className="font-semibold truncate max-w-[170px] sm:max-w-none">
                {aiStatus?.display_name || (isCopilotOnline ? "Copilot Active" : "Connecting...")}
              </span>
              <button
                type="button"
                onClick={() => refetchStatus()}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded focus-ring cursor-pointer"
                title="Refresh status"
                aria-label="Refresh status"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Monthly Report Action */}
            <button
              type="button"
              onClick={handleOpenReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#141F2E] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-xs focus-ring cursor-pointer"
              title="Open Monthly Financial Statement"
            >
              <FileText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Monthly Statement</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>
        </div>

        {/* 2. Suggested Prompt Chips */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Suggested Questions
            </span>

            {/* Group Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
              {PROMPT_GROUPS.map((group) => {
                const Icon = group.icon;
                const isActive = activeGroupTab === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveGroupTab(group.id)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-[#121C28] text-teal-800 dark:text-teal-300 shadow-xs font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    } focus-ring`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{group.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Prompts */}
          <div className="flex flex-wrap gap-2">
            {PROMPT_GROUPS.find((g) => g.id === activeGroupTab)?.prompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={isSubmitting}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-teal-500/50 transition-all text-left disabled:opacity-50 focus-ring shadow-xs cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Conversation Stream */}
      <div className={`bg-white dark:bg-[#121C28] border border-slate-200 dark:border-white/10 shadow-card flex flex-col rounded-2xl ${messages.length <= 1 ? "h-[380px] sm:h-[420px]" : "h-[480px] sm:h-[540px]"} transition-all duration-300 overflow-hidden min-w-0`}>
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "copilot" && (
                <GlassIcon
                  icon={Bot}
                  variant="teal"
                  size="sm"
                  className="shrink-0 mt-0.5"
                />
              )}

              <div className="max-w-[88%] sm:max-w-[80%] space-y-1.5">
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-tr-none font-medium ml-auto shadow-sm"
                      : "bg-slate-50/80 dark:bg-[#141F2E] border border-slate-200/80 dark:border-white/10 rounded-tl-none text-slate-800 dark:text-slate-200 shadow-sm"
                  }`}
                >
                  {/* Distinct Provider Tier Tag for Copilot Responses */}
                  {msg.sender === "copilot" && msg.responseMeta && (
                    <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-200/60 dark:border-white/10">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          msg.responseMeta.tier === 1
                            ? "bg-purple-500"
                            : msg.responseMeta.tier === 2
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-blue-500"
                        }`}
                      />
                      <span className="text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {msg.responseMeta.tier === 1
                          ? "LLM Grounded Analysis (Gemini Free Tier)"
                          : msg.responseMeta.tier === 2
                          ? "LLM Grounded Analysis (Local Ollama Qwen 2.5:3B)"
                          : "Deterministic Rule Engine (Python Domain)"}
                      </span>
                    </div>
                  )}

                  {/* Render Message with clean formatting (no raw Markdown asterisks) */}
                  <div>{renderFormattedMessage(msg.text)}</div>

                  {/* Actionable Navigation Button if suggested by Copilot */}
                  {msg.sender === "copilot" && msg.responseMeta?.navigation_action && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const action = msg.responseMeta!.navigation_action!;
                          if (action.target === "quick_add") {
                            onOpenQuickAdd?.();
                          } else if (action.target === "statement") {
                            handleOpenReport();
                          } else {
                            onNavigateTab?.(action.target, action.section);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all cursor-pointer focus-ring"
                      >
                        <span>{msg.responseMeta.navigation_action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Expandable Evidence Panel for Copilot messages */}
                  {msg.responseMeta && (
                    <EvidencePanel
                      evidence={msg.responseMeta.evidence}
                      provider={msg.responseMeta.provider}
                      tier={msg.responseMeta.tier}
                    />
                  )}
                </div>

                <div
                  className={`text-[10px] text-slate-400 dark:text-slate-500 px-1 font-mono ${
                    msg.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === "user" && (
                <GlassIcon
                  icon={UserIcon}
                  variant="slate"
                  size="sm"
                  className="shrink-0 mt-0.5"
                />
              )}
            </div>
          ))}

          {isSubmitting && (
            <div className="flex gap-2.5 sm:gap-3 justify-start items-center text-xs text-slate-600 dark:text-slate-400 animate-fade-in">
              <GlassIcon icon={Bot} variant="teal" size="sm" className="shrink-0 animate-spin" />
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl rounded-tl-none font-medium">
                Verifying ledger facts and evaluating question context...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-400 flex justify-between items-center">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold ml-2 underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Voice Recognition Error Alert */}
        {voiceError && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>{voiceError}</span>
            </span>
            <button onClick={clearVoiceError} className="font-bold ml-2 underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Voice Listening Active Banner */}
        {isListening && (
          <div className="mx-4 mb-1 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700/80 text-xs text-teal-900 dark:text-teal-200 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="font-semibold">Listening... speak into your microphone</span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-900/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Input Microphone Button */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-xl transition-all min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer focus-ring ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200 dark:border-white/10 shadow-xs"
              }`}
              title={isListening ? "Stop listening" : isVoiceSupported ? "Voice input (Speak question)" : "Voice input unavailable"}
              aria-label={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about your spending, budget pace, or outliers..."
              disabled={isSubmitting}
              className="input-base text-xs sm:text-sm py-2 bg-white dark:bg-[#121C28]"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting}
              className="btn-primary min-h-[38px] px-3.5 sm:px-4 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-ring cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask Copilot</span>
            </button>
          </form>
          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 text-center font-mono">
            Responses verified against deterministic Python financial facts.
          </div>
        </div>
      </div>

      {/* 4. Monthly Intelligence Report Modal */}
      <MonthlyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        report={reportData}
        isLoading={isReportLoading}
      />
    </div>
  );
};
