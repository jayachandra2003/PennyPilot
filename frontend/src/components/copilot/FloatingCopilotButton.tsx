import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Maximize2,
  Send,
  Mic,
  MicOff,
  Loader2,
  User as UserIcon,
  ArrowRight,
} from "lucide-react";
import { askCopilot, type CopilotQueryResponse } from "../../lib/api";
import { useVoiceInput } from "../../hooks/useVoiceInput";

interface FloatingCopilotButtonProps {
  selectedYear: number;
  selectedMonth: number;
  currentTab: string;
  onNavigateToFullCopilot: () => void;
  onNavigateTab?: (tab: string, section?: string) => void;
  onOpenQuickAdd?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  responseMeta?: CopilotQueryResponse;
}

export const FloatingCopilotButton: React.FC<FloatingCopilotButtonProps> = ({
  selectedYear,
  selectedMonth,
  currentTab,
  onNavigateToFullCopilot,
  onNavigateTab,
  onOpenQuickAdd,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "copilot",
      text: "Hello! I am PennyPilot's financial copilot. Ask me questions about your monthly spending, savings discipline, or budget pacing.",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Position state (null = default bottom-right)
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Voice input integration
  const {
    isListening,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput();

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Default position helper based on viewport size
  const getDefaultPos = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    const btnSize = 56;
    const paddingX = isMobile ? 16 : 24;
    const bottomOffset = isMobile ? 84 : 24;
    return {
      x: (typeof window !== "undefined" ? window.innerWidth : 1024) - btnSize - paddingX,
      y: (typeof window !== "undefined" ? window.innerHeight : 768) - btnSize - bottomOffset,
    };
  };

  // Clamp button within viewport boundaries
  const clampCoords = (x: number, y: number) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    const btnSize = 56;
    const padding = isMobile ? 16 : 24;
    const bottomNavbarOffset = isMobile ? 84 : 0; // Clear the 64px mobile bottom navbar + safe margin
    const maxX = window.innerWidth - btnSize - padding;
    const maxY = window.innerHeight - btnSize - padding - bottomNavbarOffset;
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY)),
    };
  };

  // Re-clamp position on window resize
  useEffect(() => {
    const handleResize = () => {
      setCoords((prev) => {
        if (!prev) return null;
        return clampCoords(prev.x, prev.y);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left mouse button
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    const def = getDefaultPos();
    startPosRef.current = {
      x: e.clientX - (coords?.x ?? def.x),
      y: e.clientY - (coords?.y ?? def.y),
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = Math.abs(moveEvent.clientX - (startPosRef.current.x + (coords?.x ?? 0)));
      const dy = Math.abs(moveEvent.clientY - (startPosRef.current.y + (coords?.y ?? 0)));
      if (dx > 4 || dy > 4) {
        hasMovedRef.current = true;
      }
      const rawX = moveEvent.clientX - startPosRef.current.x;
      const rawY = moveEvent.clientY - startPosRef.current.y;
      setCoords(clampCoords(rawX, rawY));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    const def = getDefaultPos();
    startPosRef.current = {
      x: touch.clientX - (coords?.x ?? def.x),
      y: touch.clientY - (coords?.y ?? def.y),
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const t = moveEvent.touches[0];
      const dx = Math.abs(t.clientX - (startPosRef.current.x + (coords?.x ?? 0)));
      const dy = Math.abs(t.clientY - (startPosRef.current.y + (coords?.y ?? 0)));
      if (dx > 4 || dy > 4) {
        hasMovedRef.current = true;
      }
      const rawX = t.clientX - startPosRef.current.x;
      const rawY = t.clientY - startPosRef.current.y;
      setCoords(clampCoords(rawX, rawY));
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  const handleClick = () => {
    // If was dragging, ignore click
    if (hasMovedRef.current) return;
    setIsOpen(!isOpen);
  };

  const handleSendQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    resetTranscript();
    setIsLoading(true);

    try {
      const resp = await askCopilot(q, selectedYear, selectedMonth);

      const assistantMsg: ChatMessage = {
        id: `cop_${Date.now()}`,
        sender: "copilot",
        text: resp.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        responseMeta: resp,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "copilot",
          text: "I encountered an error retrieving verified financial data. Please try again or rephrase your question.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // If already on the dedicated copilot page, do not render duplicate floating trigger
  if (currentTab === "copilot") {
    return null;
  }

  // Determine button positioning styles
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
  const buttonStyle: React.CSSProperties = coords
    ? { left: `${coords.x}px`, top: `${coords.y}px`, right: "auto", bottom: "auto" }
    : {
        right: isMobile ? "16px" : "24px",
        bottom: isMobile
          ? "calc(env(safe-area-inset-bottom, 0px) + 5.25rem)"
          : "24px",
      };

  return (
    <>
      {/* Floating Robot Head Button */}
      <div
        style={buttonStyle}
        className="fixed z-40 touch-none select-none"
      >
        <button
          type="button"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleClick}
          title="Ask PennyPilot"
          aria-label="Ask PennyPilot AI Assistant"
          className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-ledger-teal to-emerald-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/20 dark:border-white/10 focus-ring"
        >
          {/* Subtle waving idle animation */}
          <div className="relative animate-subtle-wave">
            <Bot className="w-7 h-7 text-white drop-shadow-sm group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </div>

          {/* Tooltip */}
          <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
            Ask PennyPilot
          </span>
        </button>
      </div>

      {/* Floating Chat Overlay Panel */}
      {isOpen && (
        <div className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[580px] h-[520px] rounded-3xl bg-white dark:bg-[#121C28] border border-ledger-border shadow-2xl flex flex-col overflow-hidden animate-scale-up">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ledger-border bg-ledger-surfaceSubtle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-ledger-teal/15 text-ledger-teal flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-ledger-ink">PennyPilot Assistant</h3>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Verified Ledger Grounding
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNavigateToFullCopilot();
                }}
                className="p-1.5 rounded-lg text-ledger-inkMuted hover:text-ledger-teal hover:bg-ledger-bg transition-colors"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-ledger-inkMuted hover:text-ledger-ink hover:bg-ledger-bg transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-ledger-bg/50 border-b border-ledger-border flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              "Where do I need to reduce my spending?",
              "Am I good at saving money?",
              "What is my budget pace?",
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendQuery(p)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] bg-ledger-surface border border-ledger-border hover:border-ledger-teal text-ledger-inkMuted hover:text-ledger-ink transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 text-xs leading-relaxed ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-6 h-6 rounded-lg bg-ledger-teal/15 text-ledger-teal flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] px-3 py-2 rounded-2xl ${
                      isUser
                        ? "bg-ledger-teal text-white rounded-tr-none shadow-sm"
                        : "bg-ledger-surfaceSubtle text-ledger-ink border border-ledger-border rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>

                    {!isUser && m.responseMeta?.navigation_action && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const action = m.responseMeta!.navigation_action!;
                            setIsOpen(false);
                            if (action.target === "quick_add") {
                              onOpenQuickAdd?.();
                            } else {
                              onNavigateTab?.(action.target, action.section);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-ledger-teal hover:bg-teal-700 text-white shadow-xs transition-all cursor-pointer"
                        >
                          <span>{m.responseMeta.navigation_action.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span
                      className={`block mt-1 text-[9px] text-right ${
                        isUser ? "text-white/70" : "text-ledger-inkSubtle"
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>

                  {isUser && (
                    <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-ledger-inkMuted py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-ledger-teal" />
                <span>Computing verified facts...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputText);
            }}
            className="p-2.5 border-t border-ledger-border bg-ledger-surface flex items-center gap-2"
          >
            {isVoiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`p-2 rounded-xl border transition-all ${
                  isListening
                    ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                    : "border-ledger-border bg-ledger-bg text-ledger-inkMuted hover:text-ledger-teal"
                }`}
                title={isListening ? "Stop listening" : "Speak question"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about your money..."
              className="flex-1 px-3 py-2 rounded-xl border border-ledger-border bg-ledger-bg text-ledger-ink text-xs focus-ring placeholder:text-ledger-inkSubtle"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl bg-ledger-teal text-white hover:bg-ledger-tealHover disabled:opacity-50 transition-colors flex-shrink-0 shadow-sm"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
