import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto py-16 px-4 sm:px-8 w-full flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">Terms of Service</h1>
          <p className="text-xs font-mono text-[#94A3B8] mt-2">Effective Date: August 9, 2026</p>
        </div>

        <section className="space-y-4 text-xs text-[#94A3B8] leading-relaxed border-t border-[#263244] pt-6">
          <h2 className="text-base font-bold text-[#F8FAFC]">1. Terms Acceptance</h2>
          <p>
            By accessing or using BodhAI ("Service"), you agree to abide by these Terms of Service. If you do not agree, please discontinue using the platform.
          </p>

          <h2 className="text-base font-bold text-[#F8FAFC]">2. Permitted Use & Usage Limits</h2>
          <p>
            BodhAI is provided as a cloud-hosted AI assistant operating on serverless edge infrastructure. Usage is subject to daily message limits (30 requests/day for authenticated users, 5 requests/day for guests). Automated scraping or abuse is prohibited.
          </p>

          <h2 className="text-base font-bold text-[#F8FAFC]">3. Disclaimer of Output Accuracy</h2>
          <p>
            AI model responses are generated probabilistically by open-source LLMs. Outputs are for informational and educational purposes. You are responsible for verifying code, technical calculations, or critical information.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
