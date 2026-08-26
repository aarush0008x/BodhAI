"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Message, Conversation } from "@/types";
import {
  AlertCircle,
  Send,
  Menu,
  Square,
  Share2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { fetchApi, stopGeneration } from "@/lib/api/client";
import { ShareModal } from "@/components/chat/ShareModal";

interface ChatContainerProps {
  initialConversation?: Conversation | null;
  initialMessages?: Message[];
  onConversationCreated?: (conv: Conversation) => void;
  onToggleSidebar?: () => void;
}

export function ChatContainer({
  initialConversation = null,
  initialMessages = [],
  onConversationCreated,
  onToggleSidebar,
}: ChatContainerProps) {
  const [conversation, setConversation] = useState<Conversation | null>(initialConversation);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAssistantMsgId, setCurrentAssistantMsgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setConversation(initialConversation);
    setMessages(initialMessages);
  }, [initialConversation, initialMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Handle Input Auto-Grow
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleStopGeneration = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (currentAssistantMsgId) {
      try {
        await stopGeneration(currentAssistantMsgId);
      } catch (e) {
        console.error("Stop generation call failed:", e);
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentAssistantMsgId ? { ...msg, status: "interrupted" } : msg
        )
      );
    }
    setIsGenerating(false);
    setCurrentAssistantMsgId(null);
  };

  const executeStream = async (endpoint: string, payload: any) => {
    setError(null);
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      // First try FastAPI backend streaming endpoint
      let response: Response;
      try {
        response = await fetchApi(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") throw fetchErr;
        // Fallback to Next.js API route if FastAPI is unreachable directly
        response = await fetchApi("/api/chat", {
          method: "POST",
          body: JSON.stringify({
            prompt: payload.message || payload.prompt,
            conversationId: payload.conversation_id || conversation?.id,
            model: payload.model || conversation?.model || "qwen3:8b",
          }),
          signal: abortControllerRef.current.signal,
        });
      }

      if (!response.ok) {
        let errData: any = {};
        try {
          errData = await response.json();
        } catch (e) {}
        throw new Error(errData.message || errData.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let activeAsstId = currentAssistantMsgId;

      if (!reader) throw new Error("No response stream available from AI engine.");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "").trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);

            // Handle start event
            if (parsed.type === "message_start" || parsed.type === "meta") {
              const convId = parsed.conversation_id || parsed.conversationId;
              const msgId = parsed.message_id || parsed.messageId;

              if (msgId) {
                activeAsstId = msgId;
                setCurrentAssistantMsgId(msgId);
              }

              if (parsed.is_new || parsed.isNewConv) {
                const newConv: Conversation = {
                  id: convId,
                  title: parsed.conversation_title || payload.message?.slice(0, 30) || "New Chat",
                  model: parsed.model || "qwen3:8b",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                setConversation(newConv);
                if (onConversationCreated) onConversationCreated(newConv);
              }
            }

            // Handle streaming delta text
            if (parsed.type === "message_delta" || (parsed.type === "text" && parsed.text)) {
              const delta = parsed.content ?? parsed.text ?? "";
              assistantContent += delta;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === activeAsstId
                    ? { ...msg, content: assistantContent, status: "streaming" }
                    : msg
                )
              );
            }

            // Handle completion
            if (parsed.type === "message_complete") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === activeAsstId
                    ? { ...msg, content: assistantContent, status: "completed" }
                    : msg
                )
              );
            }

            // Handle error event
            if (parsed.type === "error") {
              throw new Error(parsed.message || parsed.error || "Generation error");
            }
          } catch (e: any) {
            if (e.message && !e.message.includes("JSON")) {
              throw e;
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "An unexpected error occurred while communicating with Bodh AI.");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === currentAssistantMsgId ? { ...msg, status: "failed" } : msg
          )
        );
      }
    } finally {
      setIsGenerating(false);
      setCurrentAssistantMsgId(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const promptText = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMessageId = crypto.randomUUID();
    const assistantPlaceholderId = crypto.randomUUID();
    setCurrentAssistantMsgId(assistantPlaceholderId);

    const userMessage: Message = {
      id: userMessageId,
      conversation_id: conversation?.id || "",
      role: "user",
      content: promptText,
      status: "completed",
      created_at: new Date().toISOString(),
    };

    const assistantPlaceholder: Message = {
      id: assistantPlaceholderId,
      conversation_id: conversation?.id || "",
      role: "assistant",
      content: "",
      status: "streaming",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

    await executeStream("/chat/stream", {
      conversation_id: conversation?.id,
      message: promptText,
      model: conversation?.model || "qwen3:8b",
    });
  };

  const handleRegenerate = async (messageId: string) => {
    if (isGenerating || !conversation) return;

    // Find message index
    const targetIdx = messages.findIndex((m) => m.id === messageId);
    if (targetIdx === -1) return;

    // Find preceding user message
    const userMsg = [...messages.slice(0, targetIdx)].reverse().find((m) => m.role === "user");
    if (!userMsg) return;

    // Reset target assistant message content
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: "", status: "streaming" } : m))
    );
    setCurrentAssistantMsgId(messageId);

    await executeStream("/chat/stream", {
      conversation_id: conversation.id,
      message: userMsg.content,
      model: conversation.model || "qwen3:8b",
    });
  };

  const handleContinue = async (messageId: string) => {
    if (isGenerating || !conversation) return;

    setCurrentAssistantMsgId(messageId);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: "streaming" } : m))
    );

    await executeStream(`/chat/continue/${messageId}`, {
      conversation_id: conversation.id,
      message_id: messageId,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B1220] text-[#F8FAFC] relative overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-[#263244] bg-[#0B1220] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#162033]"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[#F8FAFC] truncate max-w-xs sm:max-w-md">
              {conversation ? conversation.title : "New Chat"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation && (
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#162033] border border-transparent hover:border-[#263244] rounded-lg flex items-center gap-1.5 transition-colors"
              title="Share conversation"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <span className="px-2.5 py-1 bg-[#162033] border border-[#263244] rounded-lg text-[11px] font-mono text-[#F59E0B] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            {conversation?.model || "qwen3:8b"}
          </span>
        </div>
      </header>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto pb-36">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-[#0B1220] flex items-center justify-center font-mono font-black text-2xl shadow-xl">
              B
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Bodh AI Workspace</h2>
              <p className="text-xs text-[#94A3B8] leading-relaxed mt-1">
                Your intelligent, local-first assistant powered by Qwen3-8B with true token streaming.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
              <button
                onClick={() => setInput("How does async/await work in Python and FastAPI?")}
                className="p-3 bg-[#111827] border border-[#263244] rounded-xl text-left text-xs text-[#94A3B8] hover:border-[#F59E0B] hover:text-[#F8FAFC] transition-colors"
              >
                "How does async/await work in Python and FastAPI?"
              </button>
              <button
                onClick={() => setInput("Write a complete binary search algorithm in Python.")}
                className="p-3 bg-[#111827] border border-[#263244] rounded-xl text-left text-xs text-[#94A3B8] hover:border-[#14B8A6] hover:text-[#F8FAFC] transition-colors"
              >
                "Write a complete binary search algorithm in Python."
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isGenerating && msg.id === currentAssistantMsgId}
              onRegenerate={handleRegenerate}
              onContinue={handleContinue}
            />
          ))
        )}

        {error && (
          <div className="max-w-3xl mx-auto my-4 p-3.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Composer Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/95 to-transparent pt-6">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-[#111827] border border-[#263244] focus-within:border-[#F59E0B] rounded-2xl p-3 shadow-2xl space-y-2.5 transition-colors"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Bodh AI anything... (Enter to send, Shift+Enter for new line)"
              className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none resize-none px-2 py-1 max-h-44"
            />

            <div className="flex items-center justify-between pt-1 border-t border-[#263244]/40 px-2 text-[11px] text-[#94A3B8]">
              <div className="flex items-center gap-3 font-mono">
                <span>{input.length} / 10,000</span>
                <span className="hidden sm:inline">Enter ↵</span>
              </div>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="px-3.5 py-1.5 bg-[#162033] hover:bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] rounded-xl font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Generating</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-4 py-1.5 bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-98"
                >
                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Send</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Share Modal */}
      {conversation && (
        <ShareModal
          conversationId={conversation.id}
          conversationTitle={conversation.title}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
