import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BodhAILogo } from "@/components/ui/BodhAILogo";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto py-16 px-4 sm:px-8 w-full flex-1 space-y-8">
        <div className="space-y-4">
          <BodhAILogo size="lg" />
          <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">About BodhAI</h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            “Bodh” represents knowledge, understanding, and awareness. BodhAI is an AI assistant engineered to make dense, complex technical and conceptual ideas understandable.
          </p>
        </div>

        <section className="space-y-4 text-xs text-[#94A3B8] leading-relaxed border-t border-[#263244] pt-6">
          <h2 className="text-base font-bold text-[#F8FAFC]">Core Purpose</h2>
          <p>
            Traditional AI chatbots often dump overwhelming text or generic summaries. BodhAI is designed to deconstruct ideas step-by-step, provide clean, executable code, and guide users toward true comprehension.
          </p>

          <h2 className="text-base font-bold text-[#F8FAFC] pt-4">Cloud-Native Edge Architecture</h2>
          <p>
            BodhAI operates on modern serverless edge infrastructure:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[#94A3B8]">
            <li><strong>Cloudflare Workers AI</strong>: Open-source instruction LLMs running directly on global edge nodes.</li>
            <li><strong>Cloudflare D1</strong>: Relational SQLite storage providing fast user data isolation.</li>
            <li><strong>Next.js OpenNext Framework</strong>: Responsive, accessible, and fast web platform.</li>
          </ul>

          <h2 className="text-base font-bold text-[#F8FAFC] pt-4">Zero Third-Party Dependency</h2>
          <p>
            BodhAI does not rely on proprietary paid AI APIs (such as OpenAI, Gemini, or Anthropic). It is designed to run efficiently on open-source models within cloud infrastructure.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
