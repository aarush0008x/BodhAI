"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { User as UserIcon, Mail, Shield, Download, Trash2, ArrowLeft, AlertTriangle } from "lucide-react";
import { User } from "@/types";
import { fetchApi } from "@/lib/api/client";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: any) => {
        if (data && data.user) setUser(data.user);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetchApi("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between border-b border-[#263244] pb-5">
          <div className="space-y-1">
            <Link href="/chat" className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Chat
            </Link>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">User Profile</h1>
            <p className="text-xs text-[#94A3B8]">Manage your personal account, security details, and data export options.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-xs text-[#94A3B8]">Loading profile details...</div>
        ) : user ? (
          <div className="space-y-6">
            {/* User Info Card */}
            <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#162033] border border-[#263244] flex items-center justify-center font-bold text-xl text-[#F59E0B] font-mono">
                  {user.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#F8FAFC]">{user.name}</h2>
                  <p className="text-xs text-[#94A3B8]">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-[#162033] border border-[#263244] rounded text-[10px] font-mono text-[#14B8A6]">
                    Role: {user.role || "user"}
                  </span>
                </div>
              </div>

              <Button onClick={handleLogout} variant="outline" className="border-[#263244] text-[#F8FAFC] hover:bg-[#162033] text-xs">
                Log Out
              </Button>
            </div>

            {/* Account Details */}
            <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#F8FAFC]">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#0B1220] border border-[#263244] rounded-lg space-y-1">
                  <div className="text-[#94A3B8]">Account Created</div>
                  <div className="font-mono text-[#F8FAFC]">{new Date(user.created_at).toLocaleDateString()}</div>
                </div>
                <div className="p-3 bg-[#0B1220] border border-[#263244] rounded-lg space-y-1">
                  <div className="text-[#94A3B8]">Daily Message Limit</div>
                  <div className="font-mono text-[#F59E0B]">30 Messages / Day</div>
                </div>
              </div>
            </div>

            {/* Danger Zone Account Deletion */}
            <div className="bg-[#111827] border border-[#EF4444]/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#EF4444]">
                <AlertTriangle className="w-4 h-4" />
                <span>Danger Zone</span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Deleting your account will permanently purge your user records and saved conversation threads from Cloudflare D1.
              </p>
              <Button variant="outline" className="border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/10 text-xs gap-2">
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-[#94A3B8] space-y-4">
            <p>You are currently browsing as a guest.</p>
            <Button href="/login" className="bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-xs border-none">
              Sign In to View Profile
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
