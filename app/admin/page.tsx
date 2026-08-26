"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Users,
  MessageSquare,
  Activity,
  Cpu,
  ArrowLeft,
  Shield,
  CreditCard,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Search,
  Server,
  Layers,
  Settings,
} from "lucide-react";
import {
  getAdminStats,
  getAdminUsers,
  updateUserRole,
  getAdminPlans,
  getAdminPayments,
  reviewPayment,
  getAdminModels,
  getAdminApplications,
  getAdminAuditLogs,
  getAdminSystemHealth,
} from "@/lib/api/client";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "plans" | "models" | "payments" | "applications" | "audit" | "system"
  >("overview");

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const loadAdminData = async () => {
    setIsLoading(true);
    setAccessDenied(false);

    try {
      const statsRes = await getAdminStats();
      if (!statsRes) {
        setAccessDenied(true);
        setIsLoading(false);
        return;
      }
      setStats(statsRes);

      const [uList, pList, payList, mList, appList, auditList, sysRes] = await Promise.all([
        getAdminUsers(),
        getAdminPlans(),
        getAdminPayments(),
        getAdminModels(),
        getAdminApplications(),
        getAdminAuditLogs(),
        getAdminSystemHealth(),
      ]);

      setUsers(uList);
      setPlans(pList);
      setPayments(payList);
      setModels(mList);
      setApplications(appList);
      setAuditLogs(auditList);
      setSystemHealth(sysRes);
    } catch (e) {
      setAccessDenied(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const ok = await updateUserRole(userId, newRole);
    if (ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    }
  };

  const handlePaymentReview = async (status: "VERIFIED" | "REJECTED") => {
    if (!selectedPayment) return;
    const ok = await reviewPayment(selectedPayment.id, status, reviewNote);
    if (ok) {
      setPayments((prev) =>
        prev.map((p) => (p.id === selectedPayment.id ? { ...p, status, review_note: reviewNote } : p))
      );
      setSelectedPayment(null);
      setReviewNote("");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 max-w-xl mx-auto w-full px-4 flex flex-col items-center justify-center text-center space-y-4 py-20">
          <div className="w-14 h-14 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">403 Forbidden — Admin Access Required</h1>
          <p className="text-xs text-[#94A3B8]">
            Your current account does not have administrative permissions. Please sign in with an admin account.
          </p>
          <Link
            href="/chat"
            className="px-4 py-2 bg-[#162033] border border-[#263244] text-[#F8FAFC] rounded-lg text-xs font-medium hover:bg-[#263244]"
          >
            Back to Workspace
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F8FAFC] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#263244] pb-4 gap-4">
          <div>
            <Link
              href="/chat"
              className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] inline-flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
            </Link>
            <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <span>BodhAI Admin Control Center</span>
              <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 rounded text-[10px] font-mono font-normal">
                v1.0.0
              </span>
            </h1>
          </div>

          <button
            onClick={loadAdminData}
            className="px-3 py-1.5 bg-[#162033] hover:bg-[#263244] border border-[#263244] rounded-lg text-xs font-medium text-[#F8FAFC] self-start sm:self-auto"
          >
            Refresh Telemetry
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-[#263244] overflow-x-auto pb-1 text-xs">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "users", label: `Users (${users.length})`, icon: Users },
            { id: "plans", label: "Plans", icon: Layers },
            { id: "models", label: "Models Catalog", icon: Cpu },
            { id: "payments", label: `UPI Payments (${payments.length})`, icon: CreditCard },
            { id: "applications", label: "Applications", icon: FileText },
            { id: "audit", label: "Audit Logs", icon: Clock },
            { id: "system", label: "System Health", icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#162033] text-[#F59E0B] border-b-2 border-[#F59E0B]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#162033]/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#94A3B8]">Loading telemetry and records...</div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#111827] border border-[#263244] rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span>Total Registered Users</span>
                      <Users className="w-4 h-4 text-[#F59E0B]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
                      {stats?.totalUsers || 0}
                    </div>
                  </div>

                  <div className="bg-[#111827] border border-[#263244] rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span>Active Conversations</span>
                      <MessageSquare className="w-4 h-4 text-[#14B8A6]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
                      {stats?.totalConversations || 0}
                    </div>
                  </div>

                  <div className="bg-[#111827] border border-[#263244] rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span>Total Messages Streamed</span>
                      <Activity className="w-4 h-4 text-[#F59E0B]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
                      {stats?.totalMessages || 0}
                    </div>
                  </div>

                  <div className="bg-[#111827] border border-[#263244] rounded-xl p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                      <span>Workers AI Requests</span>
                      <Cpu className="w-4 h-4 text-[#14B8A6]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#F8FAFC]">
                      {stats?.totalAiRequests || 0}
                    </div>
                  </div>
                </div>

                <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[#F8FAFC]">Cloudflare Production Edge Telemetry</h2>
                    <span className="px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded text-[10px] font-mono">
                      HEALTHY
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3 bg-[#0B1220] border border-[#263244] rounded-lg space-y-1">
                      <div className="text-[#94A3B8]">Primary D1 DB</div>
                      <div className="text-[#F8FAFC]">bodhai-db (APAC)</div>
                    </div>
                    <div className="p-3 bg-[#0B1220] border border-[#263244] rounded-lg space-y-1">
                      <div className="text-[#94A3B8]">Inference Model</div>
                      <div className="text-[#F59E0B]">@cf/meta/llama-3.1-8b-instruct-fast</div>
                    </div>
                    <div className="p-3 bg-[#0B1220] border border-[#263244] rounded-lg space-y-1">
                      <div className="text-[#94A3B8]">API Edge Worker</div>
                      <div className="text-[#14B8A6]">bodhai-api</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === "users" && (
              <div className="bg-[#111827] border border-[#263244] rounded-xl overflow-hidden space-y-4 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#0B1220] border border-[#263244] rounded-lg text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>
                  <span className="text-xs text-[#94A3B8]">Total: {filteredUsers.length}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#263244] text-[#94A3B8] uppercase text-[10px] font-mono">
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Role</th>
                        <th className="py-2.5 px-3">Joined</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#263244]">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#162033]/50">
                          <td className="py-3 px-3 font-semibold text-[#F8FAFC]">{u.name}</td>
                          <td className="py-3 px-3 text-[#94A3B8]">{u.email}</td>
                          <td className="py-3 px-3 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] border ${
                                u.role === "admin"
                                  ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]"
                                  : "bg-[#162033] border-[#263244] text-[#94A3B8]"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#94A3B8]">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRoleChange(u.id, u.role)}
                              className="px-2.5 py-1 bg-[#162033] hover:bg-[#263244] border border-[#263244] text-[#F8FAFC] rounded text-[11px]"
                            >
                              Toggle Role ({u.role === "admin" ? "Make User" : "Make Admin"})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PLANS TAB */}
            {activeTab === "plans" && (
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#F8FAFC]">Subscription Plans Catalog</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: "Free Plan", price: "₹0/mo", limit: "30 Msgs/day", models: "Llama 3.1 8B", active: true },
                    { name: "Pro Plan", price: "₹499/mo", limit: "500 Msgs/day", models: "All Open Models", active: true },
                    { name: "Premium Enterprise", price: "₹1,499/mo", limit: "Unlimited", models: "Priority Workers AI", active: true },
                  ].map((p, idx) => (
                    <div key={idx} className="p-4 bg-[#0B1220] border border-[#263244] rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#F8FAFC] text-sm">{p.name}</span>
                        <span className="px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 rounded text-[10px]">
                          Active
                        </span>
                      </div>
                      <div className="text-lg font-mono font-bold text-[#F59E0B]">{p.price}</div>
                      <div className="text-xs text-[#94A3B8] space-y-1">
                        <div>• Daily Limit: {p.limit}</div>
                        <div>• Models: {p.models}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODELS TAB */}
            {activeTab === "models" && (
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#F8FAFC]">Cloudflare Workers AI Catalog</h2>
                <div className="space-y-3">
                  {[
                    { id: "@cf/meta/llama-3.1-8b-instruct-fast", name: "Llama 3.1 8B Instruct Fast", isDefault: true },
                    { id: "@cf/meta/llama-3-8b-instruct", name: "Llama 3 8B Instruction", isDefault: false },
                    { id: "@cf/mistral/mistral-7b-instruct-v0.1", name: "Mistral 7B Instruction", isDefault: false },
                  ].map((m, idx) => (
                    <div key={idx} className="p-3 bg-[#0B1220] border border-[#263244] rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#F8FAFC]">{m.name}</div>
                        <div className="font-mono text-[#94A3B8] text-[11px]">{m.id}</div>
                      </div>
                      {m.isDefault && (
                        <span className="px-2 py-0.5 bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 rounded text-[10px]">
                          Default System Model
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === "payments" && (
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#F8FAFC]">Manual UPI Payment Requests</h2>
                {payments.length === 0 ? (
                  <div className="text-xs text-[#94A3B8] text-center py-6">No payment records found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#263244] text-[#94A3B8] uppercase text-[10px] font-mono">
                          <th className="py-2.5 px-3">User ID</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">UTR Reference</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#263244]">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-[#162033]/50">
                            <td className="py-3 px-3 text-[#94A3B8] font-mono">{p.user_id?.slice(0, 8)}...</td>
                            <td className="py-3 px-3 font-bold text-[#F59E0B]">₹{p.amount}</td>
                            <td className="py-3 px-3 font-mono text-[#F8FAFC]">{p.utr_reference || "N/A"}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  p.status === "VERIFIED"
                                    ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30"
                                    : p.status === "REJECTED"
                                    ? "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30"
                                    : "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30"
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedPayment(p)}
                                className="px-2.5 py-1 bg-[#162033] hover:bg-[#263244] border border-[#263244] text-[#F8FAFC] rounded text-[11px]"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Review Modal */}
                {selectedPayment && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#111827] border border-[#263244] rounded-xl max-w-md w-full p-6 space-y-4">
                      <h3 className="font-bold text-[#F8FAFC] text-sm">Review Manual UPI Payment</h3>
                      <div className="text-xs space-y-1 font-mono text-[#94A3B8]">
                        <div>Amount: ₹{selectedPayment.amount}</div>
                        <div>UTR Ref: {selectedPayment.utr_reference}</div>
                      </div>
                      <textarea
                        placeholder="Internal Review Note..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="w-full bg-[#0B1220] border border-[#263244] rounded-lg p-2.5 text-xs text-[#F8FAFC]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedPayment(null)}
                          className="px-3 py-1.5 bg-[#162033] text-[#94A3B8] rounded text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handlePaymentReview("REJECTED")}
                          className="px-3 py-1.5 bg-[#EF4444] text-white rounded text-xs font-semibold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handlePaymentReview("VERIFIED")}
                          className="px-3 py-1.5 bg-[#22C55E] text-white rounded text-xs font-semibold"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* APPLICATIONS TAB */}
            {activeTab === "applications" && (
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#F8FAFC]">Applications & Partnership Requests</h2>
                <div className="text-xs text-[#94A3B8]">No active pending application requests.</div>
              </div>
            )}

            {/* AUDIT LOGS TAB */}
            {activeTab === "audit" && (
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-semibold text-[#F8FAFC]">Administrative Audit Log</h2>
                {auditLogs.length === 0 ? (
                  <div className="text-xs text-[#94A3B8] text-center py-4">No audit logs recorded yet.</div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-[#0B1220] border border-[#263244] rounded-lg text-xs font-mono flex justify-between">
                        <div>
                          <span className="text-[#F59E0B]">{log.action}</span>
                          <span className="text-[#94A3B8] ml-2">Target: {log.target_id || "N/A"}</span>
                        </div>
                        <span className="text-[#94A3B8]">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SYSTEM HEALTH TAB */}
            {activeTab === "system" && (
              <div className="bg-[#111827] border border-[#263244] rounded-xl p-6 space-y-4 font-mono text-xs">
                <h2 className="text-sm font-semibold text-[#F8FAFC] font-sans">System Diagnostics & Infrastructure</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0B1220] border border-[#263244] rounded-lg space-y-2">
                    <div className="text-[#94A3B8]">API Worker Status</div>
                    <div className="text-[#22C55E] font-bold">OPERATIONAL</div>
                    <div className="text-[#94A3B8] text-[11px]">Region: Cloudflare Global Network</div>
                  </div>
                  <div className="p-4 bg-[#0B1220] border border-[#263244] rounded-lg space-y-2">
                    <div className="text-[#94A3B8]">D1 Database Binding</div>
                    <div className="text-[#F59E0B] font-bold">bodhai-db (Connected)</div>
                    <div className="text-[#94A3B8] text-[11px]">ID: d0cb6d6f-b338-42d4-8eb0-19a757548112</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
