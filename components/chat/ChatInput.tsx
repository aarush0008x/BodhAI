"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  enterToSend?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming = false,
  disabled = false,
  enterToSend = true,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim() && !isStreaming && !disabled) {
      onSendMessage(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (enterToSend && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-background/80 backdrop-blur-md border-t border-border sticky bottom-0 z-10">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative flex items-end bg-card border border-input rounded-xl shadow-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message BodhAI..."
            disabled={disabled}
            rows={1}
            maxLength={10000}
            className="w-full py-3 pl-4 pr-12 text-sm bg-transparent border-none focus:outline-none resize-none text-foreground placeholder:text-muted-fg min-h-[44px] max-h-[200px]"
          />

          <div className="absolute right-2 bottom-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center"
                title="Stop response"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || disabled}
                className="p-2 rounded-lg bg-accent text-accent-fg hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center justify-between text-[11px] text-muted-fg mt-2 px-1">
          <span>BodhAI — Open-source LLM inference on Cloudflare Workers AI.</span>
          <span>{input.length} / 10,000</span>
        </div>
      </div>
    </div>
  );
};
