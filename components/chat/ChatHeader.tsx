"use client";

import React from "react";
import Link from "next/link";
import { Menu, Plus, Settings, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

interface ChatHeaderProps {
  title?: string;
  modelName?: string;
  onOpenSidebar: () => void;
  onNewChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title = "BodhAI",
  modelName = "BodhAI • Llama 3.1 8B",
  onOpenSidebar,
  onNewChat,
}) => {
  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-secondary lg:hidden"
          title="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-[350px]">
            {title}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-subtle text-accent text-[11px] font-medium border border-accent/20">
            <Sparkles className="w-3 h-3" />
            {modelName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-secondary transition-colors"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
        <Link
          href="/settings"
          className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-secondary transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
};
