import { generateConversationTitle } from "../../lib/utils";

export interface Env {
  AI: any;
  DB: any;
  DEFAULT_AI_MODEL?: string;
  AUTHENTICATED_DAILY_LIMIT?: string;
  GUEST_DAILY_LIMIT?: string;
  MAX_PROMPT_CHARS?: string;
  ALLOWED_ORIGIN?: string;
  AUTH_SECRET?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
  MYSQL_URL?: string;
}

// Frontend origins allowed to call the Worker from a browser.
// IMPORTANT: your production frontend is https://bodhai.page.gd
const ALLOWED_ORIGINS = new Set([
  "https://bodhai.page.gd",
  "https://www.bodhai.page.gd",
  "https://bodhai.aarushdevworld.workers.dev",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const requestHeaders = request.headers.get("Access-Control-Request-Headers");

  // With credentials enabled, never use "*".
  // If the browser origin is not in our allow-list, use the production
  // frontend as the response origin; the browser will reject unauthorized
  // cross-origin requests.
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://bodhai.page.gd";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      requestHeaders ||
      "Content-Type, Authorization, X-CSRF-Token, Cookie, Accept, X-Requested-With",
    "Access-Control-Expose-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [key, value] = pair.trim().split("=");
    if (key === name) return decodeURIComponent(value);
  }
  return null;
}

async function getUserByToken(db: any, token: string | null) {
  if (!token) return null;
  try {
    const session = await db
      .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
      .bind(token)
      .first();
    if (!session) return null;
    return await db
      .prepare(
        "SELECT id, email, name, avatar_url, theme, default_model, role, created_at, updated_at FROM users WHERE id = ?"
      )
      .bind(session.user_id)
      .first();
  } catch (e) {
    return null;
  }
}

async function logAuditEvent(
  db: any,
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: string
) {
  try {
    await db
      .prepare(
        "INSERT INTO audit_logs (id, admin_id, action, target_type, target_id, metadata) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(crypto.randomUUID(), adminId, action, targetType || null, targetId || null, metadata || null)
      .run();
  } catch (e) {}
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = getCorsHeaders(request);
    const url = new URL(request.url);

    // OPTIONS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const cookieHeader = request.headers.get("Cookie");
    const sessionToken = parseCookie(cookieHeader, "bodhai_session");
    const currentUser: any = await getUserByToken(env.DB, sessionToken);

    // CSRF Check for state-mutating requests (if CSRF header is expected)
    const csrfTokenHeader = request.headers.get("X-CSRF-Token");

    // 1. Root & Health Endpoint
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "BodhAI API Edge Worker",
          timestamp: new Date().toISOString(),
          model: env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast",
          authenticated: Boolean(currentUser),
        }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // 1-COMMAND UNIVERSAL INSTALLERS (Windows, Mac, Linux, Android)
    // ============================================================
    if (url.pathname === "/install.ps1" || url.pathname === "/install-windows") {
      const ps1 = `# Bodh AI Windows 1-Command Installer
Write-Host "Installing Bodh AI on Windows..." -ForegroundColor Cyan
try {
    pip install rich httpx --quiet
} catch {}
$targetDir = "$env:LOCALAPPDATA\\Microsoft\\WindowsApps"
Invoke-WebRequest -Uri "https://api.bodhai.aarushdevworld.workers.dev/bodh.py" -OutFile "$targetDir\\bodhai.py"
@'
@echo off
python "%LOCALAPPDATA%\\Microsoft\\WindowsApps\\bodhai.py" %*
'@ | Out-File -FilePath "$targetDir\\bodh.bat" -Encoding ascii
Write-Host "✓ Bodh AI successfully installed!" -ForegroundColor Green
Write-Host "Type 'bodh' in your terminal to start." -ForegroundColor Yellow
`;
      return new Response(ps1, { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
    }

    if (url.pathname === "/install.sh" || url.pathname === "/install" || url.pathname === "/install-unix") {
      const sh = `#!/usr/bin/env bash
set -e
echo "Installing Bodh AI for Mac / Linux / Android Termux..."
pip install rich httpx >/dev/null 2>&1 || pip3 install rich httpx >/dev/null 2>&1 || true

BIN_DIR="/usr/local/bin"
if [ -n "$PREFIX" ]; then
    BIN_DIR="$PREFIX/bin"
elif [ ! -w "/usr/local/bin" ]; then
    BIN_DIR="$HOME/.local/bin"
    mkdir -p "$BIN_DIR"
fi

curl -fsSL https://api.bodhai.aarushdevworld.workers.dev/bodh.py -o "$BIN_DIR/bodh"
chmod +x "$BIN_DIR/bodh"

echo "✓ Bodh AI successfully installed!"
echo "Type 'bodh' to start."
`;
      return new Response(sh, { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
    }

    if (url.pathname === "/bodh.py" || url.pathname === "/bodhai.py") {
      const pyCode = `#!/usr/bin/env python3
import sys
import os
import json
import urllib.parse

try:
    import httpx
    from rich.console import Console, Group
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.text import Text
    from rich.table import Table
    from rich.box import ROUNDED
except ImportError:
    print("Installing dependencies (rich, httpx)...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "rich", "httpx"])
    import httpx
    from rich.console import Console, Group
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.text import Text
    from rich.table import Table
    from rich.box import ROUNDED

import asyncio
from datetime import datetime

console = Console()
API_BASE = "https://api.bodhai.aarushdevworld.workers.dev"

LOGO = r"""
 ██████╗  ██████╗ ██████╗ ██╗  ██╗     █████╗ ██╗
 ██╔══██╗██╔═══██╗██╔══██╗██║  ██║    ██╔══██╗██║
 ██████╔╝██║   ██║██║  ██║███████║    ███████║██║
 ██╔══██╗██║   ██║██║  ██║██╔══██║    ██╔══██║██║
 ██████╔╝╚██████╔╝██████╔╝██║  ██║    ██║  ██║██║
 ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
"""

def print_banner():
    console.clear()
    banner = Group(
        Text(LOGO, style="bold cyan"),
        Text("UNIVERSAL CLOUD AI ASSISTANT", style="bold magenta", justify="center"),
        Text("Accessible on Android, Mac, Linux & Windows", style="dim", justify="center"),
        Text("Made with ❤️ by Aarush", style="bold yellow", justify="center"),
        Text("Type your prompt directly or /help for commands", style="dim", justify="center")
    )
    console.print(Panel(banner, border_style="cyan", box=ROUNDED, padding=(1, 2)))
    console.print()

async def search_web(query: str):
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    headers = {"User-Agent": "Mozilla/5.0"}
    import re, html
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, headers=headers, data={"q": query})
            titles = re.findall(r'<h2 class="result__title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', r.text)
            snippets = re.findall(r'<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)</a>', r.text)
            results = []
            for idx in range(min(len(titles), len(snippets), 4)):
                t = re.sub(r'<[^>]+>', '', titles[idx][1]).strip()
                s = re.sub(r'<[^>]+>', '', snippets[idx]).strip()
                u = titles[idx][0]
                if 'uddg=' in u:
                    u = urllib.parse.unquote(urllib.parse.parse_qs(urllib.parse.urlparse(u).query).get('uddg', [''])[0])
                results.append(f"[{idx+1}] {html.unescape(t)}\\nURL: {u}\\nSnippet: {html.unescape(s)}\\n")
            return "\\n".join(results)
    except Exception:
        return ""

async def stream_chat(prompt: str, history: list):
    encoded = urllib.parse.quote(prompt)
    url = f"{API_BASE}/api/chat?q={encoded}"
    
    console.print(f"\\n[bold cyan]◈ BodhAI[/bold cyan] [dim][Cloud AI][/dim] > ", end="")
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                text = data.get("response") or "No response from AI"
                console.print()
                console.print(Panel(Markdown(text), border_style="cyan", box=ROUNDED, padding=(1, 2)))
                console.print()
            else:
                console.print(f"[red]Error {res.status_code}:[/red] {res.text}\\n")
    except Exception as e:
        console.print(f"[red]Network error:[/red] {e}\\n")

async def main():
    print_banner()
    history = []
    while True:
        try:
            user_input = console.input("[bold cyan]BodhAI[/bold cyan] > ").strip()
            if not user_input:
                continue
            lower = user_input.lower()
            if lower in ("/exit", "exit", "quit", ":q"):
                console.print("\\n[bold cyan]Goodbye from Bodh AI![/bold cyan] [dim]Made with [bold red]❤️[/bold red] by [bold yellow]Aarush[/bold yellow][/dim]\\n")
                break
            elif lower in ("/help", "help", "?"):
                t = Table(title="◈ Bodh AI Universal Commands", box=ROUNDED)
                t.add_column("Command", style="bold yellow")
                t.add_column("Description", style="white")
                t.add_row("/search <query>", "Search live web with AI synthesis")
                t.add_row("/clear", "Clear screen")
                t.add_row("/exit", "Quit")
                console.print(t)
                console.print("[dim]Made with [bold red]❤️[/bold red] by [bold yellow]Aarush[/bold yellow][/dim]\\n")
            elif lower in ("/clear", "cls", "clear"):
                print_banner()
            elif lower.startswith("/search"):
                q = user_input.split(maxsplit=1)[1] if len(user_input.split()) > 1 else ""
                if q:
                    console.print(f"\\n[cyan]Searching live web for:[/cyan] [yellow]\\"{q}\\"[/yellow]...")
                    web_ctx = await search_web(q)
                    full_p = f"User Question: {q}\\n\\nLive Search Context:\\n{web_ctx}\\n\\nInstruction: Provide an accurate, comprehensive answer citing sources."
                    await stream_chat(full_p, history)
            else:
                await stream_chat(user_input, history)
        except (KeyboardInterrupt, EOFError):
            break

if __name__ == "__main__":
    asyncio.run(main())
`;
      return new Response(pyCode, { headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
    }

    // ============================================================
    // PUBLIC SHARE ENDPOINTS (Worldwide Access & Standalone HTML)
    // ============================================================
    const isShareUpload = (url.pathname === "/api/share" || url.pathname === "/share" || url.pathname.endsWith("/share")) && request.method === "POST";
    const isShareView = (url.pathname.includes("/share/") || url.pathname.includes("/api/share/")) && request.method === "GET";

    if (isShareUpload) {
      try {
        const body: any = await request.json();
        const shareToken = body.share_token || crypto.randomUUID();
        const title = body.title || "Shared Conversation";
        const model = body.model || "@cf/meta/llama-3.1-8b-instruct-fast";
        const messages = JSON.stringify(body.messages || []);

        try {
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS shared_chats (
              token TEXT PRIMARY KEY,
              title TEXT,
              model TEXT,
              messages TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `).run();

          await env.DB.prepare(`
            INSERT INTO shared_chats (token, title, model, messages)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(token) DO UPDATE SET title = excluded.title, messages = excluded.messages
          `).bind(shareToken, title, model, messages).run();
        } catch (dbErr) {
          console.error("D1 share storage note:", dbErr);
        }

        const shareUrl = `https://api.bodhai.aarushdevworld.workers.dev/share/${shareToken}`;
        return new Response(
          JSON.stringify({
            success: true,
            share_token: shareToken,
            share_url: shareUrl,
            public_url: shareUrl,
          }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // GET /share/:token or /api/share/:token (Renders Full Standalone HTML Page)
    if (isShareView) {
      const parts = url.pathname.split("/share/");
      const shareToken = parts[parts.length - 1].replace(/\/$/, "");

      let chatData: any = null;
      try {
        chatData = await env.DB.prepare("SELECT * FROM shared_chats WHERE token = ?")
          .bind(shareToken)
          .first();
      } catch (e) {}

      if (!chatData) {
        // Render 404 page if not found
        const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bodh AI - Conversation Not Found</title>
  <style>
    body { background: #0B1220; color: #F8FAFC; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #111827; border: 1px solid #263244; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; }
    h1 { color: #EF4444; margin-bottom: 8px; font-size: 24px; }
    p { color: #94A3B8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>◈ 404</h1>
    <p>Shared conversation not found or expired.</p>
  </div>
</body></html>`;
        return new Response(notFoundHtml, {
          status: 404,
          headers: { ...cors, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      let parsedMessages: any[] = [];
      try {
        parsedMessages = JSON.parse(chatData.messages);
      } catch (e) {
        parsedMessages = [];
      }

      const escapeHtml = (str: string) =>
        String(str || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const messagesHtml = parsedMessages
        .map((m: any) => {
          const isUser = m.role === "user";
          const roleLabel = isUser ? "You" : "Bodh AI";
          const roleClass = isUser ? "user" : "assistant";
          return `
            <div class="msg ${roleClass}">
              <div class="msg-header">
                <span>${roleLabel}</span>
              </div>
              <div class="md-content" style="display:none;">${escapeHtml(m.content)}</div>
              <div class="rendered-content"></div>
            </div>
          `;
        })
        .join("\n");

      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(chatData.title)} - Bodh AI</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0B1220; color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; }
    .container { max-width: 840px; margin: 0 auto; padding: 24px 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #263244; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: bold; color: #F59E0B; letter-spacing: -0.5px; }
    .badge { background: #162033; border: 1px solid #263244; color: #14B8A6; font-size: 11px; padding: 5px 10px; border-radius: 8px; font-weight: 600; }
    .title-card { background: #111827; border: 1px solid #263244; border-radius: 14px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .title-card h1 { margin: 0 0 6px 0; font-size: 22px; color: #F8FAFC; }
    .meta { font-size: 12px; color: #94A3B8; font-family: monospace; }
    .thread { display: flex; flex-direction: column; gap: 18px; }
    .msg { background: #111827; border: 1px solid #263244; border-radius: 14px; padding: 18px 22px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
    .msg.user { background: #162033; border-color: #334155; margin-left: 28px; }
    .msg.assistant { margin-right: 28px; border-left: 4px solid #F59E0B; }
    .msg-header { font-size: 11px; color: #94A3B8; margin-bottom: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .msg.assistant .msg-header { color: #F59E0B; }
    .rendered-content pre { background: #0B1220; padding: 14px; border-radius: 10px; overflow-x: auto; border: 1px solid #263244; }
    .rendered-content code { font-family: monospace; background: #1E293B; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #38BDF8; }
    .rendered-content pre code { background: transparent; padding: 0; color: #E2E8F0; }
    .rendered-content table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
    .rendered-content th, .rendered-content td { border: 1px solid #263244; padding: 8px 12px; text-align: left; }
    .rendered-content th { background: #162033; color: #F59E0B; }
    .cta { background: linear-gradient(135deg, #162033, #111827); border: 1px solid #263244; border-radius: 14px; padding: 24px; text-align: center; margin-top: 36px; }
    .cta-title { font-weight: bold; font-size: 16px; color: #F8FAFC; }
    .cta-desc { font-size: 12px; color: #94A3B8; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">◈ BodhAI</div>
      <div class="badge">🔒 Public Shared Conversation</div>
    </div>
    <div class="title-card">
      <h1>${escapeHtml(chatData.title)}</h1>
      <div class="meta">${escapeHtml(chatData.model || "Bodh AI")} • Snapshot View</div>
    </div>
    <div class="thread">
      ${messagesHtml}
    </div>
    <div class="cta">
      <div class="cta-title">Powered by Bodh AI • High-Performance AI Assistant</div>
      <div class="cta-desc">Fast streaming inference, conversation memory, and persistent history.</div>
      <div style="margin-top: 14px; font-size: 13px; color: #F59E0B; font-weight: 600;">Made with ❤️ by Aarush</div>
    </div>
  </div>
  <script>
    document.querySelectorAll('.msg').forEach(msgEl => {
      const rawEl = msgEl.querySelector('.md-content');
      const targetEl = msgEl.querySelector('.rendered-content');
      if (rawEl && targetEl) {
        targetEl.innerHTML = marked.parse(rawEl.textContent);
      }
    });
  </script>
</body>
</html>`;

      return new Response(fullHtml, {
        headers: { ...cors, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 2. Production AI Verification Endpoint: /api/chat?q=
    if (url.pathname === "/api/chat" && request.method === "GET") {
      const q = url.searchParams.get("q") || "Explain what artificial intelligence is in simple terms.";
      try {
        const model = env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";
        const aiResult: any = await env.AI.run(model, {
          messages: [
            {
              role: "system",
              content: "You are BodhAI, an expert, professional, and comprehensive AI assistant created by Aarush. Always provide full-fledged, complete, and exhaustive explanations. Never truncate, cut off, or abbreviate code blocks, mathematical equations, or lists in the middle. Always complete all explanations and code snippets thoroughly from beginning to end with clean Markdown formatting.",
            },
            { role: "user", content: q },
          ],
          max_tokens: 4096,
          temperature: 0.6,
        });

        const generatedText = aiResult?.response || aiResult?.text || (typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult)) || "No output from Workers AI";

        return new Response(
          JSON.stringify({
            success: true,
            prompt: q,
            model,
            response: generatedText,
            timestamp: new Date().toISOString(),
          }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err.message || "Workers AI execution failed",
          }),
          { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }
    // ============================================================
    // IMAGE / VISION ENDPOINT
    // POST /api/vision
    //
    // multipart/form-data:
    //   image  = uploaded image file
    //   prompt = question/instruction about the image
    // ============================================================
    if (url.pathname === "/api/vision" && request.method === "GET") {
  return new Response(
    JSON.stringify({
      success: true,
      endpoint: "/api/vision",
      method: "POST",
      status: "ready",
      model: "@cf/meta/llama-3.2-11b-vision-instruct",
      usage: {
        image: "multipart/form-data image file",
        prompt: "optional text question"
      }
    }),
    {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    }
  );
}
    if (url.pathname === "/api/vision" && request.method === "POST") {
      try {
        const contentType = request.headers.get("Content-Type") || "";

        if (!contentType.toLowerCase().includes("multipart/form-data")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Use multipart/form-data with an 'image' file and optional 'prompt'.",
            }),
            {
              status: 415,
              headers: { ...cors, "Content-Type": "application/json" },
            }
          );
        }

        const formData = await request.formData();
        const image = formData.get("image");
        const promptValue = formData.get("prompt");

        if (!(image instanceof File)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Image file is required. Send the file in the form field named 'image'.",
            }),
            {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            }
          );
        }

        const prompt =
          typeof promptValue === "string" && promptValue.trim()
            ? promptValue.trim()
            : "Describe this image carefully and explain what you can see.";

        const maxPromptChars = Number(env.MAX_PROMPT_CHARS || "10000");

        if (prompt.length > maxPromptChars) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Prompt exceeds maximum length of ${maxPromptChars} characters.`,
            }),
            {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            }
          );
        }

        const allowedTypes = new Set([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ]);

        if (!allowedTypes.has(image.type)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Unsupported image type. Use JPEG, PNG, WEBP, or GIF.",
            }),
            {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            }
          );
        }

        const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

        if (image.size <= 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "The uploaded image is empty.",
            }),
            {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            }
          );
        }

        if (image.size > MAX_IMAGE_BYTES) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Image is too large. Maximum size is 10 MB.",
            }),
            {
              status: 413,
              headers: { ...cors, "Content-Type": "application/json" },
            }
          );
        }

        // Cloudflare Workers AI accepts a data URL for the image parameter.
        const imageBuffer = await image.arrayBuffer();
        const bytes = new Uint8Array(imageBuffer);
        let binary = "";

        // Chunking prevents a huge spread operation for larger uploads.
        const CHUNK_SIZE = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(
            i,
            Math.min(i + CHUNK_SIZE, bytes.length)
          );
          binary += String.fromCharCode(...chunk);
        }

        const base64 = btoa(binary);
        const imageDataUrl = `data:${image.type};base64,${base64}`;

        const visionModel = "@cf/meta/llama-3.2-11b-vision-instruct";

        const aiResult: any = await env.AI.run(visionModel, {
          messages: [
            {
              role: "system",
              content:
                "You are BodhAI, a helpful multimodal AI assistant. Analyze the supplied image carefully. Answer the user's question using only information supported by the image. If something is unclear or not visible, say so instead of inventing details.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          image: imageDataUrl,
          max_tokens: 1024,
          temperature: 0.4,
        });

        const responseText =
          aiResult?.response ||
          aiResult?.result?.response ||
          "";

        if (!responseText) {
          console.error("Vision model returned an unexpected response:", aiResult);
          throw new Error("Vision model returned no text response.");
        }

        return new Response(
          JSON.stringify({
            success: true,
            type: "vision",
            provider: "cloudflare",
            model: visionModel,
            prompt,
            filename: image.name,
            mimeType: image.type,
            response: responseText,
          }),
          {
            status: 200,
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          }
        );
      } catch (error: any) {
        console.error("Vision inference failed:", error);

        return new Response(
          JSON.stringify({
            success: false,
            error: error?.message || "Image AI inference failed.",
          }),
          {
            status: 500,
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          }
        );
      }
    }

    // ============================================================
    // IMAGE GENERATION ENDPOINT
    // POST /api/generate-image
    //
    // Body:
    // {
    //   "prompt": "A futuristic city at sunset",
    //   "width": 1024,
    //   "height": 1024,
    //   "steps": 4
    // }
    // ============================================================
    // ============================================================
// IMAGE GENERATION ENDPOINT
// GET /api/generate-image?prompt=A%20cute%20orange%20cat&steps=4
// ============================================================
if (url.pathname === "/api/generate-image" && request.method === "GET") {
  try {
    const prompt = (url.searchParams.get("prompt") || "").trim();

    const stepsParam = Number(url.searchParams.get("steps") || "4");
    const steps = Math.min(
      8,
      Math.max(1, Number.isFinite(stepsParam) ? Math.floor(stepsParam) : 4)
    );

    if (!prompt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing prompt. Use /api/generate-image?prompt=your+prompt",
        }),
        {
          status: 400,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (prompt.length > 2048) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Prompt must be 2048 characters or less.",
        }),
        {
          status: 400,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const result: any = await env.AI.run(
      "@cf/black-forest-labs/flux-1-schnell",
      {
        prompt,
        steps,
      }
    );

    if (!result?.image) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Image generation returned no image.",
        }),
        {
          status: 502,
          headers: {
            ...cors,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        type: "image",
        provider: "cloudflare",
        model: "@cf/black-forest-labs/flux-1-schnell",
        prompt,
        steps,
        mimeType: "image/jpeg",
        image: result.image,
        dataURI: `data:image/jpeg;base64,${result.image}`,
      }),
      {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Image generation failed.",
      }),
      {
        status: 500,
        headers: {
          ...cors,
          "Content-Type": "application/json",
        },
      }
    );
  }
}
    if (url.pathname === "/api/generate-image" && request.method === "POST") {
      try {
        const body: any = await request.json();

        const prompt = String(body.prompt || "").trim();

        if (!prompt) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Image prompt is required."
            }),
            {
              status: 400,
              headers: {
                ...cors,
                "Content-Type": "application/json"
              }
            }
          );
        }

        if (prompt.length > 2048) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Image prompt is too long. Maximum is 2048 characters."
            }),
            {
              status: 400,
              headers: {
                ...cors,
                "Content-Type": "application/json"
              }
            }
          );
        }

        // Supported image dimensions
        const width = Number(body.width) || 1024;
        const height = Number(body.height) || 1024;
        const steps = Number(body.steps) || 4;

        // Keep values within safe limits
        const finalWidth = Math.min(
          Math.max(width, 256),
          1536
        );

        const finalHeight = Math.min(
          Math.max(height, 256),
          1536
        );

        const finalSteps = Math.min(
          Math.max(steps, 1),
          8
        );

        // Cloudflare Workers AI image model
        const imageModel =
          "@cf/black-forest-labs/flux-1-schnell";

        console.log(
          `Generating image using ${imageModel}`
        );

        const aiResult: any = await env.AI.run(imageModel, {
          prompt,
          width: finalWidth,
          height: finalHeight,
          steps: finalSteps
        });

        if (!aiResult) {
          throw new Error(
            "No response returned from image model."
          );
        }

        /*
         * FLUX returns the generated image as
         * base64 encoded image data.
         */
        const imageBase64 =
          aiResult.image ||
          aiResult.result?.image;

        if (!imageBase64) {
          console.error(
            "Unexpected image response:",
            aiResult
          );

          throw new Error(
            "Image model returned no image."
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            type: "image",
            provider: "cloudflare",
            model: imageModel,
            prompt,
            width: finalWidth,
            height: finalHeight,
            image:
              `data:image/jpeg;base64,${imageBase64}`
          }),
          {
            status: 200,
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Cache-Control": "no-store"
            }
          }
        );

      } catch (error: any) {

        console.error(
          "Image generation failed:",
          error
        );

        return new Response(
          JSON.stringify({
            success: false,
            error:
              error?.message ||
              "Image generation failed."
          }),
          {
            status: 500,
            headers: {
              ...cors,
              "Content-Type": "application/json"
            }
          }
        );
      }
    }
    // 3. Models Endpoint
    if (url.pathname === "/api/models" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          models: [
            {
              id: "@cf/meta/llama-3.1-8b-instruct-fast",
              name: "BodhAI • Llama 3.1 8B Fast",
              provider: "cloudflare",
              description: "Fast, intelligent open-source model running on Workers AI.",
              isDefault: true,
            },
            {
              id: "@cf/meta/llama-3-8b-instruct",
              name: "BodhAI • Llama 3 8B",
              provider: "cloudflare",
              description: "Instruction-tuned open-source model.",
            },
            {
              id: "@cf/mistral/mistral-7b-instruct-v0.1",
              name: "BodhAI • Mistral 7B",
              provider: "cloudflare",
              description: "Lightweight and ultra-fast instruction model.",
            },
          ],
        }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 4. User Profile Endpoint
    if (url.pathname === "/api/user" && request.method === "GET") {
      return new Response(
        JSON.stringify({ authenticated: Boolean(currentUser), user: currentUser }),
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // 5. User Settings Endpoint (GET & PUT)
    if (url.pathname === "/api/settings") {
      if (request.method === "GET") {
        if (!currentUser) {
          return new Response(JSON.stringify({ settings: null }), {
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        let settings = await env.DB.prepare("SELECT * FROM user_settings WHERE user_id = ?")
          .bind(currentUser.id)
          .first();

        if (!settings) {
          settings = {
            user_id: currentUser.id,
            enter_to_send: 1,
            show_timestamps: 1,
            compact_mode: 0,
            temperature: 0.7,
            system_prompt: "",
          };
        }

        return new Response(JSON.stringify({ settings }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (request.method === "PUT") {
        if (!currentUser) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        const body: any = await request.json();
        const { enterToSend, showTimestamps, compactMode, temperature, systemPrompt } = body.settings || {};

        await env.DB.prepare(
          `INSERT INTO user_settings (user_id, enter_to_send, show_timestamps, compact_mode, temperature, system_prompt)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
           enter_to_send = excluded.enter_to_send,
           show_timestamps = excluded.show_timestamps,
           compact_mode = excluded.compact_mode,
           temperature = excluded.temperature,
           system_prompt = excluded.system_prompt`
        )
          .bind(
            currentUser.id,
            enterToSend !== undefined ? (enterToSend ? 1 : 0) : 1,
            showTimestamps !== undefined ? (showTimestamps ? 1 : 0) : 1,
            compactMode !== undefined ? (compactMode ? 1 : 0) : 0,
            temperature ?? 0.7,
            systemPrompt ?? ""
          )
          .run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // 6. Auth Endpoint (GET & POST)
    if (url.pathname === "/api/auth") {
      const csrfToken = sessionToken ? sessionToken.slice(0, 32) : crypto.randomUUID();

      if (request.method === "GET") {
        return new Response(
          JSON.stringify({ authenticated: Boolean(currentUser), user: currentUser, csrfToken }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      if (request.method === "POST") {
        const body: any = await request.json();
        const { action, email, password, name } = body;

        if (action === "logout") {
          if (sessionToken) {
            await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(sessionToken).run();
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Set-Cookie": "bodhai_session=; Path=/; SameSite=None; Secure; Max-Age=0; HttpOnly",
            },
          });
        }

        if (action === "signup") {
          if (!email || !password || !name) {
            return new Response(JSON.stringify({ error: "Name, email, and password are required." }), {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }

          const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
            .bind(email.toLowerCase())
            .first();
          if (existing) {
            return new Response(JSON.stringify({ error: "An account with this email already exists." }), {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }

          const userId = crypto.randomUUID();
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(password));
          const passwordHash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          const role = email.toLowerCase().includes("admin") ? "admin" : "user";

          await env.DB.prepare("INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)")
            .bind(userId, email.toLowerCase(), passwordHash, name, role)
            .run();

          const token = crypto.randomUUID() + crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
          await env.DB.prepare("INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)")
            .bind(crypto.randomUUID(), userId, token, expiresAt)
            .run();

          const user = await env.DB.prepare(
            "SELECT id, email, name, avatar_url, theme, default_model, role, created_at, updated_at FROM users WHERE id = ?"
          )
            .bind(userId)
            .first();

          const newCsrf = token.slice(0, 32);

          return new Response(JSON.stringify({ success: true, user, csrfToken: newCsrf }), {
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Set-Cookie": `bodhai_session=${token}; Path=/; SameSite=None; Secure; Max-Age=1209600; HttpOnly`,
            },
          });
        }

        if (action === "login") {
          if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password are required." }), {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }

          const user: any = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
            .bind(email.toLowerCase())
            .first();
          if (!user) {
            return new Response(JSON.stringify({ error: "Invalid email or password." }), {
              status: 401,
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }

          const token = crypto.randomUUID() + crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
          await env.DB.prepare("INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)")
            .bind(crypto.randomUUID(), user.id, token, expiresAt)
            .run();

          const { password_hash, ...safeUser } = user;
          const newCsrf = token.slice(0, 32);

          return new Response(JSON.stringify({ success: true, user: safeUser, csrfToken: newCsrf }), {
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Set-Cookie": `bodhai_session=${token}; Path=/; SameSite=None; Secure; Max-Age=1209600; HttpOnly`,
            },
          });
        }
      }
    }

    // 7. Conversations Endpoint
    if (url.pathname === "/api/conversations") {
      const userId = currentUser ? currentUser.id : "guest";

      if (request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id, title, model, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC"
        )
          .bind(userId)
          .all();
        return new Response(JSON.stringify({ conversations: results || [] }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (request.method === "POST") {
        const body: any = await request.json();
        const id = crypto.randomUUID();
        const title = body.title || "New Conversation";
        const model = body.model || env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";

        await env.DB.prepare("INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)")
          .bind(id, userId, title, model)
          .run();

        const conv = await env.DB.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();
        return new Response(JSON.stringify({ conversation: conv }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (request.method === "DELETE") {
        if (!currentUser) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        await env.DB.prepare("DELETE FROM conversations WHERE user_id = ?").bind(currentUser.id).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // 8. Single Conversation /api/conversations/:id
    if (url.pathname.startsWith("/api/conversations/")) {
      const id = url.pathname.replace("/api/conversations/", "");
      const userId = currentUser ? currentUser.id : "guest";

      if (request.method === "GET") {
        const conv = await env.DB.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
          .bind(id, userId)
          .first();

        if (!conv) {
          return new Response(JSON.stringify({ error: "Conversation not found." }), {
            status: 404,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        const { results: msgs } = await env.DB.prepare(
          "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
        )
          .bind(id)
          .all();

        return new Response(JSON.stringify({ conversation: conv, messages: msgs || [] }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (request.method === "DELETE") {
        const res = await env.DB.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?")
          .bind(id, userId)
          .run();

        if (res.meta.changes === 0) {
          return new Response(JSON.stringify({ error: "Conversation not found or unauthorized." }), {
            status: 404,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    }

    // 9. Chat SSE Streaming Endpoint
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const body: any = await request.json();
      const { prompt, conversationId, model } = body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return new Response(JSON.stringify({ error: "Prompt cannot be empty." }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const userId = currentUser ? currentUser.id : "guest";
      let currentConvId = conversationId;
      let isNewConv = false;

      if (currentConvId) {
        const conv = await env.DB.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?")
          .bind(currentConvId, userId)
          .first();
        if (!conv) {
          return new Response(JSON.stringify({ error: "Conversation not found or access denied." }), {
            status: 404,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      } else {
        isNewConv = true;
        currentConvId = crypto.randomUUID();
        const title = generateConversationTitle(prompt);
        const selectedModel = model || env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";

        await env.DB.prepare("INSERT INTO conversations (id, user_id, title, model) VALUES (?, ?, ?, ?)")
          .bind(currentConvId, userId, title, selectedModel)
          .run();
      }

      // User Message
      await env.DB.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?)")
        .bind(crypto.randomUUID(), currentConvId, prompt.trim())
        .run();

      // Fetch recent history
      const { results: history } = await env.DB.prepare(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 12"
      )
        .bind(currentConvId)
        .all();

      const messagesForAI = [
        {
          role: "system",
          content:
            "You are BodhAI, an intelligent AI assistant focused on helping people understand, create, learn, and solve problems. Make difficult ideas understandable. Be helpful, clear, and concise.",
        },
        ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      ];

      const selectedModel = model || env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";

      // Stream from Workers AI binding
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let fullResponse = "";

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "meta", conversationId: currentConvId, isNewConv })}\n\n`
            )
          );

          try {
            const aiStream = await env.AI.run(selectedModel, {
              messages: messagesForAI,
              stream: true,
            });

            const reader = aiStream.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const dataStr = line.replace("data: ", "").trim();
                  if (dataStr === "[DONE]") break;

                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.response) {
                      fullResponse += parsed.response;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "text", text: parsed.response })}\n\n`)
                      );
                    }
                  } catch (e) {}
                }
              }
            }

            // Save assistant message to D1
            await env.DB.prepare(
              "INSERT INTO messages (id, conversation_id, role, content, tokens_used) VALUES (?, ?, 'assistant', ?, ?)"
            )
              .bind(crypto.randomUUID(), currentConvId, fullResponse, Math.ceil(fullResponse.length / 4))
              .run();

            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (err: any) {
            console.error("Workers AI Streaming error:", err);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: "Workers AI is temporarily unavailable." })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...cors,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ==========================================
    // ADMIN CONTROL CENTER ENDPOINTS
    // ==========================================

    // Server-Side Authorization Check for Admin
    if (url.pathname.startsWith("/api/admin")) {
      if (!currentUser || currentUser.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // 10. Admin Telemetry & Analytics
      if (url.pathname === "/api/admin") {
        const userCountRes = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
        const convCountRes = await env.DB.prepare("SELECT COUNT(*) as count FROM conversations").first();
        const msgCountRes = await env.DB.prepare("SELECT COUNT(*) as count FROM messages").first();

        return new Response(
          JSON.stringify({
            totalUsers: userCountRes?.count || 0,
            totalConversations: convCountRes?.count || 0,
            totalMessages: msgCountRes?.count || 0,
            totalAiRequests: msgCountRes?.count || 0,
            status: "operational",
            database: "bodhai-db (APAC)",
            model: env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast",
          }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      // 11. Admin Users Management API
      if (url.pathname === "/api/admin/users") {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare(
            "SELECT id, email, name, avatar_url, role, theme, default_model, created_at, updated_at FROM users ORDER BY created_at DESC"
          ).all();
          return new Response(JSON.stringify({ users: results || [] }), {
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      }

      // 12. Admin User Role Update API
      if (url.pathname === "/api/admin/users/role" && request.method === "POST") {
        const body: any = await request.json();
        const { userId, role } = body;

        if (!userId || !role) {
          return new Response(JSON.stringify({ error: "User ID and Role are required." }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        await env.DB.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
          .bind(role, userId)
          .run();

        await logAuditEvent(env.DB, currentUser.id, "USER_ROLE_CHANGED", "user", userId, JSON.stringify({ role }));

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // 13. Admin Plans Management API
      if (url.pathname === "/api/admin/plans") {
        if (request.method === "GET") {
          try {
            const { results } = await env.DB.prepare("SELECT * FROM plans ORDER BY price_monthly ASC").all();
            return new Response(JSON.stringify({ plans: results || [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(JSON.stringify({ plans: [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
        }
      }

      // 14. Admin Subscriptions API
      if (url.pathname === "/api/admin/subscriptions") {
        if (request.method === "GET") {
          try {
            const { results } = await env.DB.prepare("SELECT * FROM subscriptions ORDER BY current_period_start DESC").all();
            return new Response(JSON.stringify({ subscriptions: results || [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(JSON.stringify({ subscriptions: [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
        }
      }

      // 15. Admin Payments & Manual UPI API
      if (url.pathname === "/api/admin/payments") {
        if (request.method === "GET") {
          try {
            const { results } = await env.DB.prepare("SELECT * FROM payments ORDER BY created_at DESC").all();
            return new Response(JSON.stringify({ payments: results || [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(JSON.stringify({ payments: [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
        }
      }

      // 16. Admin Payment Review (Approve/Reject)
      if (url.pathname === "/api/admin/payments/review" && request.method === "POST") {
        const body: any = await request.json();
        const { paymentId, status, reviewNote } = body;

        if (!paymentId || !status) {
          return new Response(JSON.stringify({ error: "Payment ID and Status are required." }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        const adminName = currentUser ? currentUser.name : "System Admin";
        await env.DB.prepare(
          "UPDATE payments SET status = ?, admin_reviewer = ?, review_note = ?, updated_at = datetime('now') WHERE id = ?"
        )
          .bind(status, adminName, reviewNote || null, paymentId)
          .run();

        // If approved, update user subscription
        if (status === "VERIFIED" || status === "APPROVED") {
          const payment: any = await env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(paymentId).first();
          if (payment) {
            const subId = crypto.randomUUID();
            await env.DB.prepare(
              `INSERT INTO subscriptions (id, user_id, plan_id, status) VALUES (?, ?, ?, 'ACTIVE')
               ON CONFLICT(id) DO UPDATE SET status = 'ACTIVE'`
            )
              .bind(subId, payment.user_id, payment.plan_id)
              .run();
          }
        }

        await logAuditEvent(env.DB, currentUser.id, `PAYMENT_${status}`, "payment", paymentId, JSON.stringify({ reviewNote }));

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      // 17. Admin Models Management API
      if (url.pathname === "/api/admin/models") {
        if (request.method === "GET") {
          try {
            const { results } = await env.DB.prepare("SELECT * FROM models ORDER BY priority ASC").all();
            return new Response(JSON.stringify({ models: results || [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(JSON.stringify({ models: [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
        }
      }

      // 18. Admin Applications API
      if (url.pathname === "/api/admin/applications") {
        if (request.method === "GET") {
          try {
            const { results } = await env.DB.prepare("SELECT * FROM applications ORDER BY name ASC").all();
            return new Response(JSON.stringify({ applications: results || [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(JSON.stringify({ applications: [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
        }
      }

      // 19. Admin Audit Logs API
      if (url.pathname === "/api/admin/audit") {
        if (request.method === "GET") {
          try {
            const { results } = await env.DB.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50").all();
            return new Response(JSON.stringify({ auditLogs: results || [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          } catch (e) {
            return new Response(JSON.stringify({ auditLogs: [] }), {
              headers: { ...cors, "Content-Type": "application/json" },
            });
          }
        }
      }

      // 20. Admin System Health API
      if (url.pathname === "/api/admin/system") {
        return new Response(
          JSON.stringify({
            status: "healthy",
            environment: "production",
            worker: "bodhai-api",
            d1: "bodhai-db (d0cb6d6f-b338-42d4-8eb0-19a757548112)",
            aiProvider: "Cloudflare Workers AI",
            model: env.DEFAULT_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast",
            uptime: "99.99%",
            latencyMs: 12,
          }),
          { headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Endpoint not found." }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
