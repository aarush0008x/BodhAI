"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language?: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = "plaintext", code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg border border-border bg-[#0d0d10] text-[#e4e4e7] overflow-hidden font-mono text-xs shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-[#18181c] border-b border-[#27272a]">
        <span className="text-[#a1a1aa] font-medium tracking-wide lowercase">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#a1a1aa] hover:text-white bg-[#27272a] hover:bg-[#3f3f46] rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="m-0 font-mono text-[13px] leading-relaxed select-text">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
