"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { Conversation, User } from "@/types";
import { getCurrentUser, getConversations, deleteConversation } from "@/lib/api/client";

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadData = async () => {
    try {
      const authData = await getCurrentUser();
      if (authData.authenticated && authData.user) {
        setUser(authData.user);
      }

      const convList = await getConversations();
      setConversations(convList);
    } catch (e) {
      console.error("Failed to load chat data:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNewChat = () => {
    router.push("/chat");
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const success = await deleteConversation(id);
      if (success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error("Delete conversation failed:", e);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B1220] text-[#F8FAFC]">
      <Sidebar
        conversations={conversations}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ChatContainer
          onToggleSidebar={() => setSidebarOpen(true)}
          onConversationCreated={(newConv) => {
            setConversations((prev) => [newConv, ...prev]);
          }}
        />
      </div>
    </div>
  );
}
