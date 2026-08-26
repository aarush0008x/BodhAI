"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Conversation, User } from "@/types";
import { BodhAILogo } from "@/components/ui/BodhAILogo";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Share2,
  Archive,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { fetchApi, renameConversation } from "@/lib/api/client";
import { ShareModal } from "@/components/chat/ShareModal";

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  user: User | null;
  onNewChat: () => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

// Group conversations by date
function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  const groups: {
    today: Conversation[];
    yesterday: Conversation[];
    previous7Days: Conversation[];
    older: Conversation[];
  } = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  conversations.forEach((conv) => {
    const time = new Date(conv.last_message_at || conv.updated_at || conv.created_at).getTime();
    if (time >= todayStart) {
      groups.today.push(conv);
    } else if (time >= yesterdayStart) {
      groups.yesterday.push(conv);
    } else if (time >= sevenDaysStart) {
      groups.previous7Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

export function Sidebar({
  conversations,
  activeId,
  user,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sharingConv, setSharingConv] = useState<Conversation | null>(null);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groups = groupConversations(filteredConversations);

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = async (convId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      await renameConversation(convId, editTitle.trim());
      if (onRenameConversation) {
        onRenameConversation(convId, editTitle.trim());
      }
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setEditingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "logout" }),
      });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const renderConversationGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        <div className="text-[10px] font-mono uppercase text-[#94A3B8] px-3 pt-3 pb-1 tracking-wider">
          {title}
        </div>
        {items.map((conv) => {
          const isActive = conv.id === activeId;
          const isEditing = conv.id === editingId;

          return (
            <div
              key={conv.id}
              className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                isActive
                  ? "bg-[#162033] text-[#F8FAFC] font-medium border-l-2 border-[#F59E0B] shadow-sm"
                  : "text-[#94A3B8] hover:bg-[#162033]/60 hover:text-[#F8FAFC]"
              }`}
            >
              {isEditing ? (
                <form
                  onSubmit={(e) => handleSaveRename(conv.id, e)}
                  className="flex items-center gap-1 w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-[#0F172A] border border-[#F59E0B] rounded px-2 py-0.5 text-xs text-[#F8FAFC] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1 text-[#10B981] hover:text-[#34D399]"
                    title="Save"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="p-1 text-[#94A3B8] hover:text-[#EF4444]"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    href={`/chat/${conv.id}`}
                    onClick={() => {
                      if (onClose) onClose();
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 py-0.5"
                  >
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#F59E0B]" : "text-[#94A3B8]"}`} />
                    <span className="truncate">{conv.title}</span>
                  </Link>

                  {/* Actions on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSharingConv(conv);
                      }}
                      className="p-1 text-[#94A3B8] hover:text-[#14B8A6] transition-colors"
                      title="Share conversation link"
                    >
                      <Share2 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleStartRename(conv, e)}
                      className="p-1 text-[#94A3B8] hover:text-[#F59E0B] transition-colors"
                      title="Rename conversation"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {onDeleteConversation && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Delete "${conv.title}"?`)) {
                            onDeleteConversation(conv.id);
                          }
                        }}
                        className="p-1 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const sidebarContent = (
    <div className="w-64 h-full bg-[#0B1220] border-r border-[#263244] flex flex-col justify-between select-none">
      {/* Top Section */}
      <div className="p-4 space-y-3 flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-1">
          <Link href="/">
            <BodhAILogo size="sm" />
          </Link>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg hover:bg-[#162033]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={() => {
            onNewChat();
            if (onClose) onClose();
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-bold text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Chat</span>
        </button>

        {/* Search Filter */}
        <div className="relative pt-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#162033] border border-[#263244] rounded-lg text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B] transition-colors"
          />
        </div>

        {/* Grouped History List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="text-xs text-[#94A3B8] px-2 py-6 text-center">
              {searchQuery ? "No matching chats." : "No previous conversations."}
            </div>
          ) : (
            <>
              {renderConversationGroup("Today", groups.today)}
              {renderConversationGroup("Yesterday", groups.yesterday)}
              {renderConversationGroup("Previous 7 Days", groups.previous7Days)}
              {renderConversationGroup("Older", groups.older)}
            </>
          )}
        </div>
      </div>

      {/* User & Settings Footer */}
      <div className="p-3 border-t border-[#263244] bg-[#0B1220] space-y-1 text-xs">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#162033] border border-[#263244]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#263244] flex items-center justify-center font-bold text-[10px] text-[#F8FAFC]">
                {user.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[#F8FAFC] truncate text-[11px]">
                  {user.name}
                </div>
                <div className="text-[10px] text-[#94A3B8] truncate">
                  {user.email}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] rounded-md transition-colors"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-between p-2 rounded-xl bg-[#162033] border border-[#263244] text-[#F8FAFC] hover:bg-[#162033]/80 transition-colors"
          >
            <span className="font-medium text-xs">Sign in for cloud sync</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#F59E0B]" />
          </Link>
        )}

        <div className="flex items-center justify-between pt-1 text-[11px] text-[#94A3B8] px-1">
          <Link href="/settings" className="hover:text-[#F8FAFC] flex items-center gap-1">
            <Settings className="w-3 h-3" />
            Settings
          </Link>
          <Link href="/profile" className="hover:text-[#F8FAFC] flex items-center gap-1">
            <UserIcon className="w-3 h-3" />
            Profile
          </Link>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {sharingConv && (
        <ShareModal
          conversationId={sharingConv.id}
          conversationTitle={sharingConv.title}
          isOpen={!!sharingConv}
          onClose={() => setSharingConv(null)}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
