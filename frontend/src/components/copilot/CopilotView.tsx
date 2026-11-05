import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, FileText, Bot, User as UserIcon, RefreshCw } from "lucide-react";
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
}

const SUGGESTED_PROMPTS = [
  "Why did my expenses increase this month?",
  "Which category consumes most of my income?",
  "How much did I spend on food?",
  "Which transactions look unusual?",
  "Am I on track with my monthly budget?",
  "How can I improve my savings rate?",
];

export const CopilotView: React.FC<CopilotViewProps> = ({ year, month }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Welcome to PennyPilot Financial Intelligence. I analyze your recorded ledger using pure deterministic computation and verified facts. Ask me any question about your spending, budget pace, or statistical outliers.",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState<MonthlyReportResponse | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setErrorMessage(err.message || "Failed to communicate with AI Copilot. Falling back to deterministic analysis.");
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

  const providerPillText = aiStatus?.display_name || "Ollama Qwen 2.5:3B (Local)";

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* 1. Top Bar: Provider Status & Intelligence Report Action */}
      <div className="bg-ledger-surface p-4 sm:p-5 rounded-2xl border border-ledger-border shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ledger-teal" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-ledger-ink">
              Grounded Financial Copilot
            </h2>
          </div>
          <p className="text-xs text-ledger-inkMuted mt-0.5">
            Strict Zero-Hallucination Architecture: Facts computed in pure Python before AI explanation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active AI Status Pill */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium bg-ledger-bg border border-ledger-borderSubtle text-ledger-ink"
            title="3-Tier Zero-Budget AI Fallback Chain active"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{providerPillText}</span>
            <button
              onClick={() => refetchStatus()}
              className="text-ledger-inkSubtle hover:text-ledger-ink ml-0.5"
              title="Refresh provider status"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Monthly Report Action */}
          <button
            onClick={handleOpenReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-ledger-teal text-white rounded-lg text-xs font-semibold hover:bg-ledger-tealDark transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Monthly Report</span>
          </button>
        </div>
      </div>

      {/* 2. Suggested Prompt Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ledger-inkMuted">
          Verified Financial Inquiries
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isSubmitting}
              className="text-xs px-3 py-1.5 rounded-full bg-ledger-surface border border-ledger-border text-ledger-ink hover:border-ledger-teal hover:text-ledger-teal transition-all text-left disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Conversation Stream */}
      <div className="bg-ledger-surface rounded-2xl border border-ledger-border shadow-card flex flex-col h-[520px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "copilot" && (
                <div className="w-8 h-8 rounded-full bg-ledger-tealLight text-ledger-teal flex items-center justify-center shrink-0 mt-0.5 border border-ledger-teal/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-1`}>
                <div
                  className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-ledger-ink text-ledger-surface rounded-tr-none font-medium ml-auto"
                      : "bg-ledger-bg border border-ledger-border rounded-tl-none text-ledger-ink shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

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
                  className={`text-[10px] text-ledger-inkSubtle px-1 ${
                    msg.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-ledger-borderSubtle text-ledger-inkMuted flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isSubmitting && (
            <div className="flex gap-3 justify-start items-center text-xs text-ledger-inkMuted animate-pulse">
              <div className="w-8 h-8 rounded-full bg-ledger-tealLight text-ledger-teal flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-ledger-bg border border-ledger-borderSubtle rounded-2xl rounded-tl-none">
                Computing fact bundle & generating grounded analysis...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 flex justify-between items-center">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-ledger-border bg-ledger-bg/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about your spending, budget, or anomalies..."
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-ledger-surface border border-ledger-border rounded-xl text-xs sm:text-sm text-ledger-ink placeholder-ledger-inkSubtle focus:outline-none focus:ring-2 focus:ring-ledger-teal focus:border-transparent transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-ledger-teal hover:bg-ledger-tealDark text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Copilot</span>
            </button>
          </form>
          <div className="mt-2 text-[10px] text-ledger-inkSubtle text-center">
            Zero Financial Hallucination Guarantee: Answers strictly cite verified backend ledger figures.
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
