"use client";

import React, { useState, useEffect } from "react";
import { X, Sun, Moon, Monitor, Shield, User, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/providers/ThemeProvider";
import { deleteAllConversations, getUserSettings, updateUserSettings } from "@/lib/api/client";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"appearance" | "chat" | "ai" | "privacy" | "account">("appearance");
  const [enterToSend, setEnterToSend] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    if (isOpen && user) {
      getUserSettings().then((res: any) => {
        if (res) {
          setEnterToSend(Boolean(res.enter_to_send));
          setShowTimestamps(Boolean(res.show_timestamps));
          setTemperature(res.temperature ?? 0.7);
        }
      });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveSettings = async () => {
    if (user) {
      await updateUserSettings({
        enterToSend,
        showTimestamps,
        compactMode: 0,
        temperature,
        systemPrompt: "",
      });
    }
    onClose();
  };

  const handleExportData = () => {
    window.location.href = "/api/conversations?export=json";
  };

  const handleClearHistory = async () => {
    if (confirm("Are you sure you want to delete all conversation history? This action cannot be undone.")) {
      await deleteAllConversations();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-[#263244] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">
        {/* Left Navigation Sidebar */}
        <div className="w-full md:w-52 border-b md:border-b-0 md:border-r border-[#263244] p-3 space-y-1 bg-[#0B1220]/50">
          <div className="px-3 py-2 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
            Settings
          </div>
          {[
            { id: "appearance", label: "Appearance", icon: Sun },
            { id: "chat", label: "Chat", icon: MessageSquare },
            { id: "ai", label: "AI & Model", icon: Bot },
            { id: "privacy", label: "Privacy", icon: Shield },
            { id: "account", label: "Account", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? "bg-[#F59E0B] text-[#0B1220]"
                    : "text-[#F8FAFC] hover:bg-[#162033]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b border-[#263244] flex items-center justify-between">
            <h2 className="text-base font-semibold capitalize text-[#F8FAFC]">
              {activeTab} Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#162033]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {activeTab === "appearance" && (
              <div className="space-y-4">
                <div>
                  <label className="font-semibold block mb-2 text-[#F8FAFC]">Theme Preference</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                      { id: "system", label: "System", icon: Monitor },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSel = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`p-3 rounded-lg border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
                            isSel
                              ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                              : "border-[#263244] hover:bg-[#162033] text-[#F8FAFC]"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#F8FAFC]">Enter to Send</div>
                    <div className="text-xs text-[#94A3B8]">Press Enter to send message, Shift+Enter for new line.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enterToSend}
                    onChange={(e) => setEnterToSend(e.target.checked)}
                    className="w-4 h-4 accent-[#F59E0B]"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-[#263244] pt-4">
                  <div>
                    <div className="font-medium text-[#F8FAFC]">Show Timestamps</div>
                    <div className="text-xs text-[#94A3B8]">Display message creation time.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showTimestamps}
                    onChange={(e) => setShowTimestamps(e.target.checked)}
                    className="w-4 h-4 accent-[#F59E0B]"
                  />
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-4">
                <div>
                  <label className="font-medium block mb-1 text-[#F8FAFC]">Primary Model</label>
                  <div className="p-3 bg-[#0B1220] rounded-lg border border-[#263244] text-xs text-[#F8FAFC] font-mono">
                    qwen3:8b (Ollama Local AI Inference)
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium text-[#F8FAFC] mb-1">
                    <span>Creativity / Temperature</span>
                    <span>{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-[#F59E0B]"
                  />
                  <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                    <span>Precise & Concise</span>
                    <span>Creative & Expressive</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-[#F8FAFC] mb-1">Data Retention</div>
                  <p className="text-xs text-[#94A3B8] mb-3">
                    Your conversations are saved securely in MySQL with connection pooling. You can export or clear your chat history anytime.
                  </p>
                  <div className="flex gap-3">
                    <Button size="sm" variant="outline" onClick={handleExportData}>
                      Export Chat History
                    </Button>
                    <Button size="sm" variant="danger" onClick={handleClearHistory}>
                      Clear All History
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-4">
                {user ? (
                  <div>
                    <div className="font-medium text-[#F8FAFC]">{user.name}</div>
                    <div className="text-xs text-[#94A3B8] mb-4">{user.email}</div>
                    <Button size="sm" variant="outline" onClick={() => (window.location.href = "/profile")}>
                      View Profile Settings
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-[#94A3B8]">
                    Log in to save settings, view usage stats, and export your chats.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-[#263244] flex justify-end">
            <Button size="sm" onClick={handleSaveSettings} className="bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706]">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
