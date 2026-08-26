"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, Monitor, Moon, Sun, Cpu, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getUserSettings, updateUserSettings, getCurrentUser } from "@/lib/api/client";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [model, setModel] = useState("qwen3:8b");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((data) => {
      if (data && data.user) {
        setUser(data.user);
        getUserSettings().then((settings: any) => {
          if (settings && settings.default_model) {
            setModel(settings.default_model);
          }
        });
      }
    });
  }, []);

  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    if (user) {
      const ok = await updateUserSettings({
        enterToSend: 1,
        showTimestamps: 1,
        compactMode: 0,
        temperature: 0.7,
        systemPrompt: "",
        default_model: newModel,
      });
      if (ok) {
        setSaveStatus("Settings saved successfully.");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#263244] pb-5">
          <div className="space-y-1">
            <Link href="/chat" className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Chat
            </Link>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Application Settings</h1>
            <p className="text-xs text-[#94A3B8]">Configure appearance, AI inference model, and session preferences.</p>
          </div>
          {saveStatus && (
            <span className="text-xs text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/30 px-3 py-1.5 rounded-lg">
              {saveStatus}
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Section: Appearance */}
          <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
              <Monitor className="w-4 h-4 text-[#F59E0B]" />
              <span>Appearance</span>
            </div>
            <p className="text-xs text-[#94A3B8]">Choose your preferred theme for the workspace.</p>

            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  theme === "dark"
                    ? "bg-[#162033] border-[#F59E0B] text-[#F8FAFC]"
                    : "bg-[#0B1220] border-[#263244] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <Moon className="w-4 h-4 text-[#F59E0B]" />
                Dark
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  theme === "light"
                    ? "bg-[#162033] border-[#F59E0B] text-[#F8FAFC]"
                    : "bg-[#0B1220] border-[#263244] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <Sun className="w-4 h-4 text-[#F59E0B]" />
                Light
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  theme === "system"
                    ? "bg-[#162033] border-[#F59E0B] text-[#F8FAFC]"
                    : "bg-[#0B1220] border-[#263244] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <Monitor className="w-4 h-4 text-[#F59E0B]" />
                System
              </button>
            </div>
          </div>

          {/* Section: AI Model */}
          <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
              <Cpu className="w-4 h-4 text-[#14B8A6]" />
              <span>Default AI Model</span>
            </div>
            <p className="text-xs text-[#94A3B8]">Select the primary LLM model for your conversation workspace.</p>

            <div className="space-y-2 max-w-lg">
              <label className="block text-xs font-mono text-[#94A3B8]">Active Model</label>
              <select
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-[#0B1220] border border-[#263244] rounded-lg p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#F59E0B]"
              >
                <option value="qwen3:8b">Bodh AI • Qwen3 8B (Ollama Local / Preferred)</option>
                <option value="@cf/meta/llama-3.1-8b-instruct-fast">Bodh AI • Llama 3.1 8B Fast (Cloud)</option>
                <option value="@cf/mistral/mistral-7b-instruct-v0.1">Bodh AI • Mistral 7B Instruction</option>
              </select>
            </div>
          </div>

          {/* Section: Security */}
          <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
              <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
              <span>Security & Data</span>
            </div>
            <div className="text-xs text-[#94A3B8] space-y-1 font-mono">
              <div>• Session Storage: HTTP-Only Secure Cookie</div>
              <div>• Inference Provider: Local Ollama & High-Performance Streaming</div>
              <div>• Database Persistence: MySQL with Async Connection Pooling</div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
