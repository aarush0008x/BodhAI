"use client";

import React, { useState } from "react";
import { Message } from "@/types";
import { Copy, Check, RotateCw, Play, User as UserIcon, AlertTriangle } from "lucide-react";
import { CodeBlock } from "@/components/chat/CodeBlock";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onContinue?: (messageId: string) => void;
}

// Markdown parser and renderer for structured AI output
function renderFormattedContent(content: string, isStreaming: boolean = false) {
  if (!content) {
    if (isStreaming) {
      return (
        <div className="flex items-center gap-1 py-1 text-[#94A3B8] text-xs">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      );
    }
    return null;
  }

  // Split into code block and non-code segments
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index);
      parts.push(renderTextSegment(textBefore, `text-${lastIndex}`));
    }

    const language = match[1]?.trim() || "plaintext";
    const code = match[2]?.trimEnd() || "";
    parts.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={language}
        code={code}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  // Trailing text after the last code block
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    parts.push(renderTextSegment(remainingText, `text-${lastIndex}`));
  }

  return <div className="space-y-2">{parts}</div>;
}

function renderTextSegment(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (idx: number) => {
    if (tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer, `${keyPrefix}-tbl-${idx}`));
      tableBuffer = [];
      inTable = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table detection: line starts and ends with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      tableBuffer.push(trimmed);
      return;
    } else if (inTable) {
      flushTable(idx);
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`${keyPrefix}-h3-${idx}`} className="text-sm font-bold text-[#F8FAFC] pt-3 pb-1 border-b border-[#263244]/50">
          {renderInlineFormatting(trimmed.substring(4))}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`${keyPrefix}-h2-${idx}`} className="text-base font-bold text-[#F8FAFC] pt-4 pb-1 border-b border-[#263244]">
          {renderInlineFormatting(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`${keyPrefix}-h1-${idx}`} className="text-lg font-bold text-[#F8FAFC] pt-4 pb-2 border-b border-[#263244]">
          {renderInlineFormatting(trimmed.substring(2))}
        </h1>
      );
    }
    // Blockquote
    else if (trimmed.startsWith("> ")) {
      elements.push(
        <blockquote key={`${keyPrefix}-quote-${idx}`} className="pl-3 py-1 my-2 border-l-2 border-[#F59E0B] bg-[#162033]/40 text-xs text-[#CBD5E1] italic rounded-r">
          {renderInlineFormatting(trimmed.substring(2))}
        </blockquote>
      );
    }
    // Bullet list
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={`${keyPrefix}-li-${idx}`} className="flex items-start gap-2 pl-2 text-xs leading-relaxed text-[#E2E8F0]">
          <span className="text-[#F59E0B] font-bold mt-1 text-[8px]">•</span>
          <span className="flex-1">{renderInlineFormatting(trimmed.substring(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (numMatch) {
        elements.push(
          <div key={`${keyPrefix}-num-${idx}`} className="flex items-start gap-2 pl-2 text-xs leading-relaxed text-[#E2E8F0]">
            <span className="text-[#14B8A6] font-mono font-bold text-xs shrink-0">{numMatch[1]}.</span>
            <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
          </div>
        );
      }
    }
    // Empty line
    else if (!trimmed) {
      elements.push(<div key={`${keyPrefix}-space-${idx}`} className="h-2" />);
    }
    // Standard paragraph
    else {
      elements.push(
        <p key={`${keyPrefix}-p-${idx}`} className="text-xs leading-relaxed text-[#E2E8F0]">
          {renderInlineFormatting(line)}
        </p>
      );
    }
  });

  if (tableBuffer.length > 0) {
    flushTable(lines.length);
  }

  return <div key={keyPrefix} className="space-y-1">{elements}</div>;
}

function renderTable(tableLines: string[], key: string): React.ReactNode {
  if (tableLines.length < 2) return null;

  // Filter out divider line (e.g. |---|---|)
  const rows = tableLines.filter((l) => !/^[|\s-:]+$/.test(l));
  if (rows.length === 0) return null;

  const headerCells = rows[0]
    .split("|")
    .map((c) => c.trim())
    .filter((c, i, a) => i > 0 && i < a.length - 1);

  const bodyRows = rows.slice(1).map((r) =>
    r
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, a) => i > 0 && i < a.length - 1)
  );

  return (
    <div key={key} className="my-3 overflow-x-auto rounded-xl border border-[#263244] bg-[#0F172A] shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#162033] border-b border-[#263244] text-[#F8FAFC]">
          <tr>
            {headerCells.map((cell, idx) => (
              <th key={idx} className="px-3.5 py-2 font-semibold">
                {renderInlineFormatting(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#263244]/60 text-[#CBD5E1]">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[#162033]/30 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3.5 py-2">
                  {renderInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Inline formatting for **bold**, *italic*, and `code`
function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[#F8FAFC]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-[#E2E8F0]">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="px-1.5 py-0.5 mx-0.5 bg-[#162033] border border-[#263244] rounded text-[11px] font-mono text-[#F59E0B]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}

export function MessageBubble({
  message,
  isStreaming = false,
  onRegenerate,
  onContinue,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isInterrupted = message.status === "interrupted";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`py-5 px-4 sm:px-6 w-full ${isUser ? "bg-[#0B1220]" : "bg-[#111827]/70 border-y border-[#263244]/30"}`}>
      <div className="max-w-3xl mx-auto flex items-start gap-3.5">
        {/* Avatar */}
        {isUser ? (
          <div className="w-7 h-7 rounded-xl bg-[#162033] border border-[#263244] text-[#F8FAFC] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-[#0B1220] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md font-mono">
            B
          </div>
        )}

        {/* Message Content Container */}
        <div className="flex-1 space-y-2 min-w-0">
          {/* Header Row */}
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#F8FAFC]">
                {isUser ? "You" : "Bodh AI"}
              </span>
              {isInterrupted && (
                <span className="px-1.5 py-0.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded text-[10px] text-[#F59E0B] flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Stopped
                </span>
              )}
            </div>

            {/* Actions for Assistant */}
            {!isUser && !isStreaming && message.content && (
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2 py-1 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#162033] rounded-md flex items-center gap-1 transition-colors"
                  title="Copy full message"
                >
                  {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>

                {onRegenerate && (
                  <button
                    type="button"
                    onClick={() => onRegenerate(message.id)}
                    className="px-2 py-1 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#162033] rounded-md flex items-center gap-1 transition-colors"
                    title="Regenerate this response"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                )}

                {onContinue && isInterrupted && (
                  <button
                    type="button"
                    onClick={() => onContinue(message.id)}
                    className="px-2 py-1 bg-[#162033] text-[#F59E0B] hover:text-[#FBBF24] hover:bg-[#263244] rounded-md flex items-center gap-1 transition-colors font-medium"
                    title="Continue generation from last point"
                  >
                    <Play className="w-3 h-3" />
                    <span>Continue</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Formatted Content */}
          <div className="text-sm leading-relaxed text-[#F8FAFC]">
            {renderFormattedContent(message.content, isStreaming)}
          </div>
        </div>
      </div>
    </div>
  );
}
