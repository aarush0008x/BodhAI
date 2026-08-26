import { ShareResponse, SharedConversation } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_FASTAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

let cachedCsrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  cachedCsrfToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("bodhai_csrf", token);
    } else {
      localStorage.removeItem("bodhai_csrf");
    }
  }
}

export function getCsrfToken(): string | null {
  if (cachedCsrfToken) return cachedCsrfToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem("bodhai_csrf");
  }
  return null;
}

export function getApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(path);
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const csrf = getCsrfToken();
  if (csrf && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", csrf);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

// User & Auth
export async function getCurrentUser(): Promise<{ authenticated: boolean; user: any; csrfToken?: string }> {
  try {
    const res = await fetchApi("/api/auth");
    if (!res.ok) return { authenticated: false, user: null };
    const data: any = await res.json();
    if (data && data.csrfToken) setCsrfToken(data.csrfToken);
    return data;
  } catch (e) {
    return { authenticated: false, user: null };
  }
}

export async function login(email: string, password: string) {
  const res = await fetchApi("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "login", email, password }),
  });
  const data: any = await res.json();
  if (res.ok && data && data.csrfToken) setCsrfToken(data.csrfToken);
  return { ok: res.ok, status: res.status, data };
}

export async function signup(name: string, email: string, password: string) {
  const res = await fetchApi("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "signup", name, email, password }),
  });
  const data: any = await res.json();
  if (res.ok && data && data.csrfToken) setCsrfToken(data.csrfToken);
  return { ok: res.ok, status: res.status, data };
}

export async function logout() {
  const res = await fetchApi("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action: "logout" }),
  });
  setCsrfToken(null);
  return res.ok;
}

// Conversations Management
export async function getConversations() {
  try {
    const res = await fetchApi("/conversations");
    if (res.ok) {
      const data: any = await res.json();
      return Array.isArray(data) ? data : data.conversations || [];
    }
    // Fallback to Next.js API route
    const fallbackRes = await fetchApi("/api/conversations");
    if (fallbackRes.ok) {
      const fallbackData: any = await fallbackRes.json();
      return fallbackData.conversations || [];
    }
  } catch (e) {
    console.error("Failed to load conversations:", e);
  }
  return [];
}

export async function getConversation(id: string): Promise<any> {
  try {
    const res = await fetchApi(`/conversations/${id}`);
    if (res.ok) {
      return res.json();
    }
    // Fallback
    const fallbackRes = await fetchApi(`/api/conversations/${id}`);
    if (fallbackRes.ok) {
      return fallbackRes.json();
    }
  } catch (e) {
    console.error("Failed to load conversation:", e);
  }
  return null;
}

export async function createConversation(title?: string, model?: string) {
  const res = await fetchApi("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title, model }),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  return data.conversation;
}

export async function renameConversation(id: string, title: string) {
  const res = await fetchApi(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  if (res.ok) return res.json();
  return null;
}

export async function deleteConversation(id: string) {
  const res = await fetchApi(`/conversations/${id}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function deleteAllConversations() {
  const res = await fetchApi("/api/conversations", {
    method: "DELETE",
  });
  return res.ok;
}

export async function archiveConversation(id: string) {
  const res = await fetchApi(`/conversations/${id}/archive`, {
    method: "POST",
  });
  return res.ok;
}

// Sharing API
export async function shareConversation(id: string, expiresInDays?: number): Promise<ShareResponse | null> {
  const res = await fetchApi(`/conversations/${id}/share`, {
    method: "POST",
    body: JSON.stringify({ expires_in_days: expiresInDays }),
  });
  if (res.ok) {
    return res.json();
  }
  return null;
}

export async function disableShareConversation(id: string): Promise<boolean> {
  const res = await fetchApi(`/conversations/${id}/share`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function getSharedConversation(token: string): Promise<SharedConversation | null> {
  const res = await fetchApi(`/share/${token}`);
  if (res.ok) {
    return res.json();
  }
  return null;
}

// Chat Actions
export async function stopGeneration(messageId: string): Promise<boolean> {
  const res = await fetchApi(`/chat/stop/${messageId}`, {
    method: "POST",
  });
  return res.ok;
}

// Settings
export async function getUserSettings() {
  const res = await fetchApi("/api/settings");
  if (!res.ok) return null;
  const data: any = await res.json();
  return data.settings;
}

export async function updateUserSettings(settings: any) {
  const res = await fetchApi("/api/settings", {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
  return res.ok;
}

// Admin API
export async function getAdminStats() {
  const res = await fetchApi("/api/admin");
  if (!res.ok) return null;
  return res.json();
}

export async function getAdminUsers() {
  const res = await fetchApi("/api/admin/users");
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.users || [];
}

export async function updateUserRole(userId: string, role: string) {
  const res = await fetchApi("/api/admin/users/role", {
    method: "POST",
    body: JSON.stringify({ userId, role }),
  });
  return res.ok;
}

export async function getAdminPlans() {
  const res = await fetchApi("/api/admin/plans");
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.plans || [];
}

export async function getAdminSubscriptions() {
  const res = await fetchApi("/api/admin/subscriptions");
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.subscriptions || [];
}

export async function getAdminPayments() {
  const res = await fetchApi("/api/admin/payments");
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.payments || [];
}

export async function reviewPayment(paymentId: string, status: string, reviewNote?: string) {
  const res = await fetchApi("/api/admin/payments/review", {
    method: "POST",
    body: JSON.stringify({ paymentId, status, reviewNote }),
  });
  return res.ok;
}

export async function getAdminModels() {
  const res = await fetchApi("/api/admin/models");
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.models || [];
}

export async function getAdminApplications() {
  const res = await fetchApi("/api/admin/applications");
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.applications || [];
}

export async function getAdminAuditLogs() {
  const res = await fetchApi("/api/admin/audit");
  if (!res.ok) return [];
  const data: any = await res.json();
  return data.auditLogs || [];
}

export async function getAdminSystemHealth() {
  const res = await fetchApi("/api/admin/system");
  if (!res.ok) return null;
  return res.json();
}
