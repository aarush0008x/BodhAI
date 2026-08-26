"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { User, Conversation, Message } from "@/types";
import { getCurrentUser, getConversations, getConversation, deleteConversation } from "@/lib/api/client";

export default function SingleChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadChat = async () => {
      setIsLoading(true);
      try {
        const authData = await getCurrentUser();
        if (authData.authenticated && authData.user) {
          setUser(authData.user);
        }

        const convList = await getConversations();
        setConversations(convList);

        const singleData = await getConversation(id);
        if (singleData) {
          const conv = singleData.conversation || singleData;
          setActiveConversation(conv);
          setMessages(singleData.messages || []);
        } else {
          router.push("/chat");
        }
      } catch (e) {
        console.error("Failed to load conversation:", e);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      loadChat();
    }
  }, [id, router]);

  const handleNewChat = () => {
    router.push("/chat");
  };

  const handleDeleteConversation = async (targetId: string) => {
    try {
      const success = await deleteConversation(targetId);
      if (success) {
        setConversations((prev) => prev.filter((c) => c.id !== targetId));
        if (targetId === id) {
          router.push("/chat");
        }
      }
    } catch (e) {
      console.error("Delete conversation failed:", e);
    }
  };

  const handleRenameConversation = (targetId: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === targetId ? { ...c, title: newTitle } : c))
    );
    if (activeConversation && activeConversation.id === targetId) {
      setActiveConversation({ ...activeConversation, title: newTitle });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B1220] text-[#F8FAFC]">
      <Sidebar
        conversations={conversations}
        activeId={id}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-[#94A3B8]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#F59E0B]" />
            <span>Loading conversation...</span>
          </div>
        ) : (
          <ChatContainer
            initialConversation={activeConversation}
            initialMessages={messages}
            onToggleSidebar={() => setSidebarOpen(true)}
          />
        )}
      </div>
    </div>
  );
}
