"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BodhAILogo } from "@/components/ui/BodhAILogo";
import { Button } from "@/components/ui/Button";
import { User as UserIcon, Lock, Mail, AlertCircle, ArrowLeft } from "lucide-react";
import { fetchApi } from "@/lib/api/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetchApi("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "signup", name, email, password }),
      });

      const data: any = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Signup failed.");
      }

      router.push("/chat");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col justify-between selection:bg-[#F59E0B]/30 p-4 sm:p-8">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <Link href="/">
          <BodhAILogo size="md" />
        </Link>
        <Link href="/" className="text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
      </div>

      <div className="w-full max-w-4xl mx-auto my-auto grid grid-cols-1 md:grid-cols-2 bg-[#111827] border border-[#263244] rounded-2xl shadow-2xl overflow-hidden">
        {/* Left Branding Panel */}
        <div className="p-8 sm:p-12 bg-[#162033] border-b md:border-b-0 md:border-r border-[#263244] flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <BodhAILogo size="lg" />
            <h2 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              Start with BodhAI today.
            </h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Create an account to save persistent chat history, unlock elevated daily message quotas, and customize system settings.
            </p>
          </div>

          <div className="p-4 bg-[#0B1220] border border-[#263244] rounded-xl space-y-1 font-mono text-[11px] text-[#94A3B8]">
            <div className="text-[#14B8A6] font-semibold">// Account Benefits</div>
            <div>• 30 Daily AI Messages</div>
            <div>• Persistent Cloudflare D1 Storage</div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="p-8 sm:p-12 flex flex-col justify-center space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#F8FAFC]">Create Account</h1>
            <p className="text-xs text-[#94A3B8]">Get started in seconds</p>
          </div>

          {error && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-xs text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#94A3B8]">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-10 pr-4 h-11 bg-[#0B1220] border border-[#263244] rounded-lg text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#94A3B8]">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94A3B8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 h-11 bg-[#0B1220] border border-[#263244] rounded-lg text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#94A3B8]">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#94A3B8]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-4 h-11 bg-[#0B1220] border border-[#263244] rounded-lg text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-sm border-none mt-2"
            >
              {isLoading ? "Creating account..." : "Create Free Account"}
            </Button>
          </form>

          <p className="text-center text-xs text-[#94A3B8]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#F59E0B] hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="text-center text-xs text-[#94A3B8] py-2">
        BodhAI — Intelligence, Made Understandable.
      </div>
    </div>
  );
}
