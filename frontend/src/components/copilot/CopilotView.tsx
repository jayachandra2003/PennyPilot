import React, { useState, useRef, useEffect } from "react";
import { Send, FileText, Bot, User as UserIcon, RefreshCw, BarChart2, ShieldAlert, Compass } from "lucide-react";
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

interface PromptGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  prompts: string[];
}

const PROMPT_GROUPS: PromptGroup[] = [
  {
    id: "spending",
    label: "Spending Analysis",
    icon: BarChart2,
    prompts: [
      "Why did my expenses increase this month?",
      "Which category consumes most of my income?",
      "How much did I spend on food?",
    ],
  },
  {
    id: "budget",
    label: "Budget & Pace",
    icon: Compass,
    prompts: [
      "Am I on track with my monthly budget?",
      "How can I improve my savings rate?",
    ],
  },
  {
    id: "audit",
    label: "Audit & Outliers",
    icon: ShieldAlert,
    prompts: [
      "Which transactions look unusual?",
    ],
  },
];

export const CopilotView: React.FC<CopilotViewProps> = ({ year, month }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Welcome to PennyPilot Financial Intelligence. I synthesize your recorded ledger using pure deterministic computation and verified facts. Inquire about your spending velocity, budget pace, category allocation, or statistical outliers.",
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
    <div className="space-y-4 max-w-4xl mx-auto animate-fade-in pb-6 min-w-0">
      {/* 1. Header & AI Provider Status Bar */}
      <div className="bg-ledger-surface border border-ledger-border rounded-lg shadow-card p-4 sm:p-5 md:p-6 space-y-3 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-ledger-borderSubtle pb-3 sm:pb-4 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-ledger-inkSubtle font-semibold">
                AI Financial Intelligence • Fact-Grounded Synthesis
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-ledger-ink tracking-tight">
              Financial AI Copilot
            </h2>
            <p className="text-xs text-ledger-inkMuted mt-0.5">
              Responses grounded in verified financial records computed in pure Python before explanation.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {/* Active AI Status Pill with 3-Tier Fallback Indication */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-mono bg-ledger-surfaceSubtle border border-ledger-border text-ledger-ink select-none"
              title="3-Tier Zero-Budget Fallback: Hosted Free Tier → Local Ollama → Deterministic Engine"
            >
              <span className="w-2 h-2 rounded-full bg-ledger-sage animate-pulse shrink-0" />
              <span className="font-semibold truncate max-w-[170px] sm:max-w-none">{providerPillText}</span>
              <button
                onClick={() => refetchStatus()}
                className="text-ledger-inkSubtle hover:text-ledger-ink ml-0.5 p-0.5 rounded focus-ring"
                title="Refresh provider status"
                aria-label="Refresh provider status"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Monthly Report Action */}
            <button
              onClick={handleOpenReport}
              className="btn-primary text-xs px-3 sm:px-3.5 py-1.5 min-h-[36px] flex items-center gap-1.5 focus-ring"
              title="Generate comprehensive monthly intelligence report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Monthly Report</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>
        </div>

        {/* 2. Grouped Inquiry Suggestions */}
        <div className="space-y-2 pt-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-ledger-inkSubtle font-semibold">
              Structured Inquiries
            </span>
            {/* Category Switcher Tabs */}
            <div className="inline-flex items-center bg-ledger-surfaceSubtle border border-ledger-border rounded p-0.5 select-none">
              {PROMPT_GROUPS.map((group) => {
                const isActive = activeGroupTab === group.id;
                const Icon = group.icon;
                return (
                  <button
                    key={group.id}
                    onClick={() => setActiveGroupTab(group.id)}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                      isActive
                        ? "bg-ledger-ink text-white shadow-hairline"
                        : "text-ledger-inkMuted hover:text-ledger-ink"
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
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {PROMPT_GROUPS.find((g) => g.id === activeGroupTab)?.prompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isSubmitting}
                className="text-xs px-2.5 sm:px-3 py-1.5 rounded bg-ledger-surfaceSubtle/70 hover:bg-ledger-surface border border-ledger-border text-ledger-ink hover:border-ledger-borderDark transition-all text-left disabled:opacity-50 focus-ring"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Conversation Stream */}
      <div className={`card-base p-0 flex flex-col ${messages.length <= 1 ? "h-[360px] sm:h-[400px]" : "h-[450px] sm:h-[500px]"} transition-all duration-300 overflow-hidden min-w-0`}>
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 sm:gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "copilot" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-ledger-tealLight text-ledger-teal flex items-center justify-center shrink-0 mt-0.5 border border-ledger-teal/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="max-w-[88%] sm:max-w-[78%] space-y-1">
                <div
                  className={`p-3.5 sm:p-4 rounded-lg text-xs md:text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-ledger-ink text-white rounded-tr-none font-medium ml-auto shadow-sm"
                      : "bg-ledger-surfaceSubtle/60 border border-ledger-borderSubtle rounded-tl-none text-ledger-ink shadow-sm"
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
                  className={`text-[10px] text-ledger-inkSubtle px-1 font-mono ${
                    msg.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-ledger-surfaceSubtle text-ledger-inkMuted flex items-center justify-center shrink-0 mt-0.5 border border-ledger-border">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isSubmitting && (
            <div className="flex gap-2.5 sm:gap-3 justify-start items-center text-xs text-ledger-inkMuted animate-pulse">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-ledger-tealLight text-ledger-teal flex items-center justify-center shrink-0 border border-ledger-teal/20">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-ledger-surfaceSubtle border border-ledger-border rounded-lg rounded-tl-none">
                Computing verified fact bundle & generating grounded analysis...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="px-4 py-2 bg-ledger-redLight border-t border-ledger-red/20 text-xs text-ledger-red flex justify-between items-center">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-ledger-borderSubtle bg-ledger-surfaceSubtle/60">
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
              placeholder="Ask anything about your spending, budget pace, or outliers..."
              disabled={isSubmitting}
              className="input-base text-xs sm:text-sm py-2"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting}
              className="btn-primary min-h-[38px] px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-ring"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask Copilot</span>
            </button>
          </form>
          <div className="mt-2 text-[10px] text-ledger-inkSubtle text-center font-mono">
            Responses grounded in verified financial records.
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
