"use client";

import React, { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { CodeBlock } from "./CodeBlock";
import { Message } from "@/types";
import { Copy, Check, RotateCw, Edit2, User } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === "user";

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent.trim());
      setIsEditing(false);
    }
  };

  // Render markdown parser with code block extraction
  const renderContent = (content: string) => {
    if (!content) return null;

    // Split by code blocks ```lang ... ```
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : "plaintext";
        const code = language !== "plaintext" ? lines.slice(1).join("\n") : lines.join("\n");
        return <CodeBlock key={index} language={language} code={code} />;
      }

      // Basic inline formatting: split lines/paragraphs
      const paragraphs = part.split("\n\n");
      return (
        <React.Fragment key={index}>
          {paragraphs.map((p, pIdx) => {
            if (!p.trim()) return null;

            // Header level 3 or 4
            if (p.startsWith("### ")) {
              return (
                <h3 key={pIdx} className="text-base font-semibold mt-3 mb-1 text-foreground">
                  {p.replace("### ", "")}
                </h3>
              );
            }

            if (p.startsWith("#### ")) {
              return (
                <h4 key={pIdx} className="text-sm font-semibold mt-2 mb-1 text-foreground">
                  {p.replace("#### ", "")}
                </h4>
              );
            }

            // Bullet points
            if (p.includes("\n- ") || p.startsWith("- ") || p.includes("\n• ")) {
              const bullets = p.split(/\n[-•]\s*/).filter(Boolean);
              return (
                <ul key={pIdx} className="list-disc list-inside my-2 space-y-1 text-sm text-foreground">
                  {bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              );
            }

            return (
              <p key={pIdx} className="my-1.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {p}
              </p>
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div
      className={`py-4 px-4 sm:px-6 transition-colors border-b border-border/40 ${
        isUser ? "bg-transparent" : "bg-card/50"
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-secondary-fg border border-border">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <Logo size="sm" showWordmark={false} />
          )}
        </div>

        {/* Message Content & Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-foreground">
              {isUser ? "You" : "BodhAI"}
            </span>
            <span className="text-[11px] text-muted-fg">
              {message.created_at
                ? new Date(message.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs border border-border rounded-md hover:bg-secondary text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs bg-primary text-primary-fg rounded-md hover:bg-primary-hover"
                >
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="prose-custom">
              {renderContent(message.content)}
              {isStreaming && (
                <span className="typing-cursor font-mono text-accent ml-1 animate-pulse font-bold">
                  ▋
                </span>
              )}
            </div>
          )}

          {/* Action Bar */}
          {!isStreaming && !isEditing && (
            <div className="flex items-center gap-2 mt-3 pt-1 text-muted-fg">
              <button
                onClick={handleCopyMessage}
                className="p-1 hover:text-foreground rounded transition-colors text-xs inline-flex items-center gap-1"
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              {isUser && onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:text-foreground rounded transition-colors text-xs inline-flex items-center gap-1"
                  title="Edit prompt"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}

              {!isUser && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1 hover:text-foreground rounded transition-colors text-xs inline-flex items-center gap-1"
                  title="Regenerate response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
