"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, Share2, Globe, ShieldOff, AlertCircle, Loader2 } from "lucide-react";
import { shareConversation, disableShareConversation } from "@/lib/api/client";
import { ShareResponse } from "@/types";

interface ShareModalProps {
  conversationId: string;
  conversationTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({
  conversationId,
  conversationTitle = "Conversation",
  isOpen,
  onClose,
}: ShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  useEffect(() => {
    if (isOpen && conversationId) {
      loadShareLink();
    } else {
      setShareData(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, conversationId]);

  const loadShareLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shareConversation(conversationId);
      if (data) {
        setShareData(data);
      } else {
        setError("Failed to create share link. Please try again.");
      }
    } catch (e: any) {
      setError(e.message || "An error occurred while generating share link.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareData?.share_url) return;
    navigator.clipboard.writeText(shareData.share_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      const success = await disableShareConversation(conversationId);
      if (success) {
        setShareData(null);
        onClose();
      } else {
        setError("Failed to disable share link.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to disable link.");
    } finally {
      setIsDisabling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#0F172A] border border-[#263244] rounded-2xl shadow-2xl overflow-hidden z-10 text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#263244] bg-[#162033]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg text-[#F59E0B]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Share Conversation</h3>
              <p className="text-[11px] text-[#94A3B8] truncate max-w-[240px]">
                {conversationTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#263244] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-[#162033] border border-[#263244] rounded-xl text-xs text-[#94A3B8] leading-relaxed">
            <Globe className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
            <span>
              Anyone with this link will be able to view a clean, read-only snapshot of this chat.
              Your account details and other conversations remain strictly private.
            </span>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-xs text-[#94A3B8]">
              <Loader2 className="w-6 h-6 animate-spin text-[#F59E0B]" />
              <span>Generating secure share link...</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : shareData ? (
            <div className="space-y-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Public Share URL
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareData.share_url}
                  className="flex-1 bg-[#111827] border border-[#263244] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] font-mono focus:outline-none selection:bg-[#F59E0B] selection:text-[#0B1220]"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1220] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#263244] text-xs">
                <div className="flex items-center gap-2 text-[#10B981] font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  <span>Link Active</span>
                </div>

                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={isDisabling}
                  className="text-xs text-[#EF4444] hover:text-[#DC2626] font-medium flex items-center gap-1.5 p-1 rounded transition-colors disabled:opacity-50"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  <span>{isDisabling ? "Disabling..." : "Disable Link"}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
