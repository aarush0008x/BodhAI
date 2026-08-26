"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BodhAILogo } from "@/components/ui/BodhAILogo";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SharedConversation, Message } from "@/types";
import { getSharedConversation } from "@/lib/api/client";
import { ArrowRight, Lock, Calendar, MessageSquare, AlertCircle } from "lucide-react";

export default function SharedChatPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<SharedConversation | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchShared = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSharedConversation(token);
        if (data) {
          setConversation(data);
        } else {
          setError("This shared conversation was not found, has expired, or was disabled by its creator.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load shared conversation.");
      } finally {
        setLoading(false);
      }
    };

    fetchShared();
  }, [token]);

  const formattedDate = conversation?.created_at
    ? new Date(conversation.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#263244] bg-[#0B1220]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/">
            <BodhAILogo size="sm" />
          </Link>
          <span className="px-2 py-0.5 bg-[#162033] border border-[#263244] rounded text-[10px] font-mono text-[#94A3B8] flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-[#14B8A6]" />
            Shared View
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="px-3.5 py-1.5 bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-98"
          >
            <span>Try Bodh AI</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-xs text-[#94A3B8] gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F59E0B]" />
            <span>Loading shared conversation...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#F8FAFC]">Conversation Unavailable</h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{error}</p>
            <Link
              href="/chat"
              className="px-4 py-2 bg-[#162033] hover:bg-[#263244] border border-[#263244] rounded-xl text-xs text-[#F8FAFC] font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <span>Start your own chat on Bodh AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : conversation ? (
          <div className="space-y-6">
            {/* Conversation Header Card */}
            <div className="p-6 bg-[#111827] border border-[#263244] rounded-2xl space-y-2 shadow-xl">
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <MessageSquare className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="font-mono text-[11px]">{conversation.model}</span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formattedDate}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
                {conversation.title}
              </h1>
            </div>

            {/* Messages Thread */}
            <div className="rounded-2xl border border-[#263244] bg-[#0F172A] overflow-hidden shadow-2xl divide-y divide-[#263244]/50">
              {conversation.messages.map((msg, index) => {
                const messageObj: Message = {
                  id: msg.id,
                  conversation_id: "",
                  role: msg.role,
                  content: msg.content,
                  created_at: msg.created_at,
                  status: "completed",
                };
                return (
                  <MessageBubble
                    key={msg.id || index}
                    message={messageObj}
                  />
                );
              })}
            </div>

            {/* Bottom CTA Card */}
            <div className="p-6 bg-gradient-to-r from-[#162033] to-[#111827] border border-[#263244] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">
                  Experience fast, private AI inference with Bodh AI
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Powered by Qwen3-8B with true streaming and conversation memory.
                </p>
              </div>
              <Link
                href="/chat"
                className="px-5 py-2.5 bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0 active:scale-98"
              >
                <span>Launch Bodh AI</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
