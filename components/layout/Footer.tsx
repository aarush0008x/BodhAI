import React from "react";
import Link from "next/link";
import { BodhAILogo } from "@/components/ui/BodhAILogo";

export function Footer() {
  return (
    <footer className="bg-[#0B1220] border-t border-[#263244] text-[#94A3B8] text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <BodhAILogo size="sm" />
            <p className="text-[#94A3B8] leading-relaxed">
              Intelligence, Made Understandable.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <div className="font-semibold text-[#F8FAFC] text-xs uppercase tracking-wider mb-2 font-mono">Product</div>
            <div><Link href="#product" className="hover:text-[#F8FAFC] transition-colors">Workspace</Link></div>
            <div><Link href="#features" className="hover:text-[#F8FAFC] transition-colors">Features</Link></div>
            <div><Link href="/about" className="hover:text-[#F8FAFC] transition-colors">About</Link></div>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <div className="font-semibold text-[#F8FAFC] text-xs uppercase tracking-wider mb-2 font-mono">Account</div>
            <div><Link href="/login" className="hover:text-[#F8FAFC] transition-colors">Log in</Link></div>
            <div><Link href="/signup" className="hover:text-[#F8FAFC] transition-colors">Sign up</Link></div>
            <div><Link href="/profile" className="hover:text-[#F8FAFC] transition-colors">Profile Settings</Link></div>
          </div>

          {/* Legal & Tech */}
          <div className="space-y-2">
            <div className="font-semibold text-[#F8FAFC] text-xs uppercase tracking-wider mb-2 font-mono">Technology</div>
            <div><span className="text-[#94A3B8]">Cloudflare Workers AI</span></div>
            <div><Link href="/privacy" className="hover:text-[#F8FAFC] transition-colors">Privacy Policy</Link></div>
            <div><Link href="/terms" className="hover:text-[#F8FAFC] transition-colors">Terms of Service</Link></div>
          </div>
        </div>

        <div className="pt-6 border-t border-[#263244]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#94A3B8]">
          <div>© {new Date().getFullYear()} BodhAI. All rights reserved.</div>
          <div className="font-mono text-[11px]">Powered by Cloudflare Workers AI & D1</div>
        </div>
      </div>
    </footer>
  );
}
