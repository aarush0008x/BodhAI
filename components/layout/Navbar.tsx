"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BodhAILogo } from "@/components/ui/BodhAILogo";
import { Button } from "@/components/ui/Button";
import { User } from "@/types";
import { fetchApi } from "@/lib/api/client";
import { MessageSquare, User as UserIcon, Menu, X } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchApi("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: any) => {
        if (data && data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0B1220]/90 backdrop-blur-md border-b border-[#263244] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <BodhAILogo size="md" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#94A3B8]">
          <Link href="#product" className="hover:text-[#F8FAFC] transition-colors">
            Product
          </Link>
          <Link href="#features" className="hover:text-[#F8FAFC] transition-colors">
            Features
          </Link>
          <Link href="/about" className="hover:text-[#F8FAFC] transition-colors">
            About
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Button
                href="/chat"
                size="sm"
                className="gap-2 bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-xs border-none"
              >
                <MessageSquare className="w-4 h-4" />
                Open Workspace
              </Button>
              <Link
                href="/profile"
                className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#162033] rounded-lg transition-colors"
                title="Profile"
              >
                <UserIcon className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-3 py-2">
                Log in
              </Link>
              <Button
                href="/chat"
                size="sm"
                className="bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-xs border-none"
              >
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#94A3B8] hover:text-[#F8FAFC] focus:outline-none"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#111827] border-b border-[#263244] px-4 pt-3 pb-6 space-y-4 animate-fadeIn">
          <nav className="flex flex-col gap-3 text-xs font-medium">
            <Link href="#product" onClick={() => setMobileMenuOpen(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] py-1">
              Product
            </Link>
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] py-1">
              Features
            </Link>
            <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] py-1">
              About
            </Link>
          </nav>
          <div className="pt-3 border-t border-[#263244] flex flex-col gap-2">
            {user ? (
              <Button
                href="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full justify-center bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-xs border-none"
              >
                Open Workspace
              </Button>
            ) : (
              <>
                <Button
                  href="/login"
                  variant="outline"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full justify-center border-[#263244] text-[#F8FAFC] text-xs"
                >
                  Log in
                </Button>
                <Button
                  href="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full justify-center bg-[#F59E0B] text-[#0B1220] hover:bg-[#D97706] font-semibold text-xs border-none"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
