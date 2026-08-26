"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Code2,
  Brain,
  Zap,
  Shield,
  Lock,
  Cpu,
} from "lucide-react";

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#F59E0B]/30 selection:text-[#F8FAFC]">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#263244]/60">
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Hero Copy */}
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#162033] border border-[#263244] text-xs font-mono text-[#94A3B8]">
                <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                <span>Powered by open-source AI</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#F8FAFC] leading-[1.1]">
                Understand more. <br />
                <span className="text-[#F59E0B]">Do more.</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#94A3B8] leading-relaxed max-w-2xl">
                BodhAI helps you understand concepts, solve problems, write code, and turn difficult information into clear, useful answers.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  href="/chat"
                  size="lg"
                  className="w-full sm:w-auto bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-base px-7 h-12 gap-2 border-none"
                >
                  Start using BodhAI
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Button
                  href="#product"
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-[#263244] text-[#F8FAFC] hover:bg-[#162033] h-12 text-base px-6"
                >
                  Explore the product
                </Button>
              </div>
            </div>

            {/* REALISTIC HERO PRODUCT PREVIEW CARD */}
            <div className="bg-[#111827] border border-[#263244] rounded-xl shadow-2xl overflow-hidden max-w-4xl">
              {/* Window Bar */}
              <div className="bg-[#162033] px-4 py-3 border-b border-[#263244] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
                  <span className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
                  <span className="w-3 h-3 rounded-full bg-[#10B981]/80" />
                  <span className="ml-2 text-xs font-mono text-[#94A3B8]">BodhAI Workspace • Llama 3.1 8B</span>
                </div>
                <span className="text-xs text-[#94A3B8] font-mono">Live Preview</span>
              </div>

              {/* Chat Thread */}
              <div className="p-6 space-y-6 text-sm">
                {/* User Message */}
                <div className="flex items-start gap-3 max-w-2xl">
                  <div className="w-7 h-7 rounded bg-[#263244] flex items-center justify-center text-xs font-semibold text-[#F8FAFC] shrink-0">
                    You
                  </div>
                  <div className="bg-[#162033] border border-[#263244] rounded-lg p-3.5 text-[#F8FAFC]">
                    Explain quantum computing simply and how it differs from classical computers.
                  </div>
                </div>

                {/* Assistant Message */}
                <div className="flex items-start gap-3 max-w-2xl">
                  <div className="w-7 h-7 rounded bg-[#F59E0B] text-[#0B1220] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    B
                  </div>
                  <div className="space-y-3 text-[#94A3B8] leading-relaxed">
                    <p className="text-[#F8FAFC]">
                      Classical computers store information in bits that are either <code className="text-[#14B8A6] font-mono bg-[#162033] px-1 py-0.5 rounded">0</code> or <code className="text-[#14B8A6] font-mono bg-[#162033] px-1 py-0.5 rounded">1</code>. Quantum computers use <strong>qubits</strong>, which can exist in a superposition of both states simultaneously.
                    </p>

                    <div className="bg-[#0B1220] border border-[#263244] rounded-md p-3 font-mono text-xs text-[#F8FAFC] space-y-1">
                      <div className="text-[#94A3B8]">// Key differences:</div>
                      <div>1. Bits: Sequential processing (0 or 1)</div>
                      <div>2. Qubits: Parallel probability states via Superposition</div>
                    </div>
                  </div>
                </div>

                {/* Interactive Prompt Bar Mockup */}
                <div className="pt-2">
                  <Link href="/chat" className="block">
                    <div className="bg-[#0B1220] border border-[#263244] rounded-lg p-3 flex items-center justify-between hover:border-[#F59E0B] transition-colors">
                      <span className="text-[#94A3B8] text-xs">Ask a follow-up question or paste code...</span>
                      <div className="w-7 h-7 rounded bg-[#F59E0B] text-[#0B1220] flex items-center justify-center">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE SECTION */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#263244]/60">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-[#F59E0B] tracking-wider">Features</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
                Built for understanding.
              </h2>
              <p className="text-[#94A3B8]">
                BodhAI combines structured reasoning, real-time code analysis, and clear explanations into a streamlined tool.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4 hover:border-[#F59E0B]/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#162033] border border-[#263244] flex items-center justify-center text-[#F59E0B]">
                  <Brain className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Understand</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Turn complex concepts into structured explanations you can actually follow and apply.
                </p>
              </div>

              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4 hover:border-[#14B8A6]/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#162033] border border-[#263244] flex items-center justify-center text-[#14B8A6]">
                  <Code2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Build</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Get practical help with code, system architecture, debugging, and technical decisions.
                </p>
              </div>

              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4 hover:border-[#F59E0B]/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#162033] border border-[#263244] flex items-center justify-center text-[#F59E0B]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Learn</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Break unfamiliar technical topics into progressive, easy-to-digest learning steps.
                </p>
              </div>

              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4 hover:border-[#14B8A6]/50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#162033] border border-[#263244] flex items-center justify-center text-[#14B8A6]">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Think</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Explore ideas, compare engineering approaches, and reason through difficult problems.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT WORKSPACE DEMO SECTION */}
        <section id="product" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#263244]/60">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-[#14B8A6] tracking-wider">Product</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
                One workspace for thinking.
              </h2>
              <p className="text-[#94A3B8]">
                A dedicated interface designed for deep work, persistent conversation history, and real-time streaming answers.
              </p>
            </div>

            {/* Application Mockup Layout */}
            <div className="bg-[#111827] border border-[#263244] rounded-xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-4">
              <div className="bg-[#0B1220] p-4 border-b md:border-b-0 md:border-r border-[#263244] space-y-4 text-xs">
                <div className="flex items-center justify-between font-bold text-[#F8FAFC]">
                  <span>BodhAI</span>
                  <span className="text-[#F59E0B] font-mono">+ New</span>
                </div>
                <div className="space-y-1 text-[#94A3B8]">
                  <div className="p-2 bg-[#162033] text-[#F8FAFC] rounded font-medium truncate">Quantum Computing Basics</div>
                  <div className="p-2 hover:bg-[#162033]/50 rounded truncate">Next.js API Edge Streaming</div>
                  <div className="p-2 hover:bg-[#162033]/50 rounded truncate">Cloudflare D1 SQL Schema</div>
                </div>
              </div>

              <div className="md:col-span-3 p-6 space-y-6 flex flex-col justify-between min-h-[360px]">
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#263244]">
                    <span className="font-semibold text-[#F8FAFC]">Quantum Computing Basics</span>
                    <span className="font-mono text-[#94A3B8]">Llama 3.1 8B Fast</span>
                  </div>

                  <div className="bg-[#162033] p-3 rounded text-[#F8FAFC] max-w-lg">
                    How does state superposition work in quantum mechanics?
                  </div>

                  <div className="space-y-2 text-[#94A3B8] leading-relaxed max-w-xl">
                    <p className="text-[#F8FAFC]">
                      Superposition allows a quantum system to exist in a linear combination of states simultaneously until observed.
                    </p>
                  </div>
                </div>

                <Link href="/chat" className="block">
                  <div className="bg-[#0B1220] border border-[#263244] rounded-lg p-2.5 flex items-center justify-between text-xs hover:border-[#F59E0B] transition-colors">
                    <span className="text-[#94A3B8]">Ask a question...</span>
                    <div className="px-3 py-1 bg-[#F59E0B] text-[#0B1220] rounded font-semibold text-[11px]">Send</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#263244]/60">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-[#F59E0B] tracking-wider">Workflow</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
                How BodhAI Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="text-3xl font-mono font-bold text-[#F59E0B]">01</div>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Ask</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Describe what you want to understand, paste code, or ask a complex architectural question.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-3xl font-mono font-bold text-[#14B8A6]">02</div>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Explore</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  BodhAI breaks the topic down using open-source reasoning models on Cloudflare Workers AI.
                </p>
              </div>

              <div className="space-y-3">
                <div className="text-3xl font-mono font-bold text-[#F8FAFC]">03</div>
                <h3 className="text-lg font-semibold text-[#F8FAFC]">Understand</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Turn structured answers into practical knowledge, executable code, and key takeaways.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRIVACY & SECURITY SECTION */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#263244]/60">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-mono uppercase text-[#14B8A6] tracking-wider">Trust & Security</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F8FAFC]">
                Your conversations belong to you.
              </h2>
              <p className="text-[#94A3B8]">
                BodhAI is built on secure cloud-native primitives with zero client-side credential exposure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-5 space-y-3">
                <Shield className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-sm font-semibold text-[#F8FAFC]">Secure Authentication</h3>
                <p className="text-xs text-[#94A3B8]">Web Crypto PBKDF2 hashing with unique salts and HTTP-only session cookies.</p>
              </div>

              <div className="bg-[#111827] border border-[#263244] rounded-xl p-5 space-y-3">
                <Lock className="w-5 h-5 text-[#14B8A6]" />
                <h3 className="text-sm font-semibold text-[#F8FAFC]">Private Conversations</h3>
                <p className="text-xs text-[#94A3B8]">Strict IDOR scoping ensures User A cannot access User B's conversation history.</p>
              </div>

              <div className="bg-[#111827] border border-[#263244] rounded-xl p-5 space-y-3">
                <Cpu className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-sm font-semibold text-[#F8FAFC]">No Credentials in Browser</h3>
                <p className="text-xs text-[#94A3B8]">AI inference runs strictly server-side over Cloudflare Workers bindings.</p>
              </div>
            </div>

            {/* Technical Stack Badges */}
            <div className="pt-6 flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 bg-[#162033] border border-[#263244] rounded text-xs font-mono text-[#94A3B8]">
                Open-source AI inference
              </span>
              <span className="px-3 py-1 bg-[#162033] border border-[#263244] rounded text-xs font-mono text-[#94A3B8]">
                Cloudflare Workers AI
              </span>
              <span className="px-3 py-1 bg-[#162033] border border-[#263244] rounded text-xs font-mono text-[#94A3B8]">
                Cloudflare D1 Database
              </span>
              <span className="px-3 py-1 bg-[#162033] border border-[#263244] rounded text-xs font-mono text-[#94A3B8]">
                Edge Architecture
              </span>
            </div>
          </div>
        </section>

        {/* RESTRAINED CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto bg-[#111827] border border-[#263244] rounded-2xl p-10 text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">
              Ready to understand something difficult?
            </h2>
            <p className="text-[#94A3B8] max-w-xl mx-auto text-sm">
              Start using BodhAI today with zero complex setup, local machine requirements, or paid API keys.
            </p>
            <div>
              <Button
                href="/chat"
                size="lg"
                className="bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-base px-8 h-12 border-none"
              >
                Start with BodhAI
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
