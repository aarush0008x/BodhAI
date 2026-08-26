import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto py-16 px-4 sm:px-8 w-full flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">Privacy Policy</h1>
          <p className="text-xs font-mono text-[#94A3B8] mt-2">Effective Date: August 9, 2026</p>
        </div>

        <section className="space-y-4 text-xs text-[#94A3B8] leading-relaxed border-t border-[#263244] pt-6">
          <h2 className="text-base font-bold text-[#F8FAFC]">1. Information We Collect</h2>
          <p>
            When you register an account, we store your name, email address, and an encrypted password hash. When you converse with BodhAI, your conversation text and settings are stored in your isolated database records in Cloudflare D1.
          </p>

          <h2 className="text-base font-bold text-[#F8FAFC]">2. How We Use Data</h2>
          <p>
            Your data is used solely to provide and maintain your AI assistant experience, persist your chat history, and enforce daily rate limits. We do not sell your personal data or trade prompt histories to commercial third parties.
          </p>

          <h2 className="text-base font-bold text-[#F8FAFC]">3. Data Retention & Control</h2>
          <p>
            You have full ownership of your data. You can delete individual conversations or purge your complete account and history at any time.
          </p>

          <h2 className="text-base font-bold text-[#F8FAFC]">4. Security Standards</h2>
          <p>
            All network communication is encrypted over HTTPS. Password hashes use Web Crypto PBKDF2 algorithm with unique cryptographic salts, and session tokens are transmitted using HTTP-only cookies with Strict/Lax SameSite policies.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
