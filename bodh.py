import sys
import os
import re
import csv
import json
import uuid
import html
import asyncio
import sqlite3
import datetime
import webbrowser
import urllib.parse
from pathlib import Path

try:
    import httpx
    from rich.console import Console, Group
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.text import Text
    from rich.table import Table
    from rich.box import ROUNDED
    from rich.live import Live
    from rich.spinner import Spinner
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
    from rich.live import Live
    from rich.spinner import Spinner

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

console = Console()

API_BASE = "https://api.bodhai.aarushdevworld.workers.dev"
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")

DATA_DIR = Path.home() / ".bodhai"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "bodhai.db"

EXPORT_DIR = Path.home() / "BodhAI" / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_DIR = Path.home() / "BodhAI" / "generated_images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

LOGO = r"""
 ██████╗  ██████╗ ██████╗ ██╗  ██╗     █████╗ ██╗
 ██╔══██╗██╔═══██╗██╔══██╗██║  ██║    ██╔══██╗██║
 ██████╔╝██║   ██║██║  ██║███████║    ███████║██║
 ██╔══██╗██║   ██║██║  ██║██╔══██║    ██╔══██║██║
 ██████╔╝╚██████╔╝██████╔╝██║  ██║    ██║  ██║██║
 ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
"""

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            model TEXT NOT NULL,
            is_archived INTEGER DEFAULT 0,
            share_token TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            status TEXT DEFAULT 'completed',
            tokens_used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()

def clean_response(text: str) -> str:
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    cleaned = re.sub(r"\[/?INST\]", "", cleaned).strip()
    return cleaned

class BodhAIClient:
    def __init__(self):
        init_db()
        self.provider = "cloud"
        self.conversation_id = None
        self.conversation_title = "New Chat"
        self.last_assistant_msg_id = None
        self.last_user_prompt = None

    def start_new_chat(self):
        self.conversation_id = str(uuid.uuid4())
        self.conversation_title = "New Chat"
        self.last_assistant_msg_id = None
        self.last_user_prompt = None
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO conversations (id, title, model) VALUES (?, ?, ?)",
                  (self.conversation_id, self.conversation_title, "llama-3.1-8b" if self.provider == "cloud" else OLLAMA_MODEL))
        conn.commit()
        conn.close()
        console.print("[bold green]✓ Started a new conversation session.[/bold green]\n")

    def ensure_chat(self, first_prompt: str = ""):
        if not self.conversation_id:
            self.conversation_id = str(uuid.uuid4())
            title = first_prompt[:30].strip() if first_prompt else "New Chat"
            self.conversation_title = title
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("INSERT INTO conversations (id, title, model) VALUES (?, ?, ?)",
                      (self.conversation_id, self.conversation_title, "llama-3.1-8b" if self.provider == "cloud" else OLLAMA_MODEL))
            conn.commit()
            conn.close()

    def save_message(self, role: str, content: str, tokens: int = 0) -> str:
        msg_id = str(uuid.uuid4())
        now = datetime.datetime.now().isoformat()
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT INTO messages (id, conversation_id, role, content, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                  (msg_id, self.conversation_id, role, content, tokens, now))
        c.execute("UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?",
                  (now, now, self.conversation_id))
        conn.commit()
        conn.close()
        return msg_id

    def get_history(self) -> list:
        if not self.conversation_id:
            return []
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (self.conversation_id,))
        rows = c.fetchall()
        conn.close()
        return [{"role": r[0], "content": r[1]} for r in rows]

    def list_history(self):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, title, created_at, (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) FROM conversations ORDER BY created_at DESC LIMIT 30")
        rows = c.fetchall()
        conn.close()

        if not rows:
            console.print("[yellow]No conversation history found.[/yellow]\n")
            return

        table = Table(title="◈ Past Conversations", box=ROUNDED, border_style="cyan")
        table.add_column("#", style="bold yellow", width=4)
        table.add_column("Title", style="bold white", width=36)
        table.add_column("Messages", style="cyan", width=10)
        table.add_column("Date", style="dim", width=20)

        for idx, (cid, title, created_at, msg_count) in enumerate(rows, 1):
            is_curr = " [green](Active)[/green]" if cid == self.conversation_id else ""
            table.add_row(str(idx), f"{title}{is_curr}", str(msg_count), str(created_at)[:16])

        console.print()
        console.print(table)
        console.print("[dim]Use /resume <#> to switch to any past conversation[/dim]\n")

    def resume_chat(self, arg: str):
        arg = arg.strip().lstrip("#")
        if not arg:
            console.print("[yellow]Usage: /resume <number or ID>[/yellow]\n")
            return

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, title FROM conversations ORDER BY created_at DESC LIMIT 30")
        rows = c.fetchall()

        target = None
        if arg.isdigit():
            idx = int(arg) - 1
            if 0 <= idx < len(rows):
                target = rows[idx]
        else:
            for r in rows:
                if r[0].startswith(arg):
                    target = r
                    break

        if target:
            self.conversation_id, self.conversation_title = target
            c.execute("SELECT id, content FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1", (self.conversation_id,))
            last_msg = c.fetchone()
            self.last_assistant_msg_id = last_msg[0] if last_msg else None
            console.print(f"[bold green]✓ Switched to conversation: {self.conversation_title}[/bold green]\n")
        else:
            console.print(f"[red]Conversation '{arg}' not found. Check /history.[/red]\n")
        conn.close()

    def rename_current_chat(self, new_title: str):
        if not self.conversation_id:
            console.print("[yellow]No active conversation to rename.[/yellow]\n")
            return
        new_title = new_title.strip()
        if not new_title:
            console.print("[yellow]Usage: /rename <new-title>[/yellow]\n")
            return
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("UPDATE conversations SET title = ? WHERE id = ?", (new_title, self.conversation_id))
        conn.commit()
        conn.close()
        self.conversation_title = new_title
        console.print(f"[bold green]✓ Conversation renamed to: {new_title}[/bold green]\n")

    def delete_chat(self, arg: str = ""):
        target_id = self.conversation_id
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        if arg.strip():
            arg_clean = arg.strip().lstrip("#")
            c.execute("SELECT id FROM conversations ORDER BY created_at DESC LIMIT 30")
            rows = c.fetchall()
            if arg_clean.isdigit():
                idx = int(arg_clean) - 1
                if 0 <= idx < len(rows):
                    target_id = rows[idx][0]
            else:
                for r in rows:
                    if r[0].startswith(arg_clean):
                        target_id = r[0]
                        break

        if not target_id:
            console.print("[yellow]No conversation to delete.[/yellow]\n")
            conn.close()
            return

        c.execute("DELETE FROM messages WHERE conversation_id = ?", (target_id,))
        c.execute("DELETE FROM conversations WHERE id = ?", (target_id,))
        conn.commit()
        conn.close()

        if target_id == self.conversation_id:
            self.conversation_id = None
            self.conversation_title = "New Chat"
            self.last_assistant_msg_id = None
            self.last_user_prompt = None

        console.print("[bold green]✓ Conversation deleted successfully.[/bold green]\n")

    async def share_current_chat(self):
        if not self.conversation_id:
            console.print("[yellow]No active conversation to share yet. Send a message first.[/yellow]\n")
            return

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (self.conversation_id,))
        rows = c.fetchall()
        msgs = [{"role": r[0], "content": r[1]} for r in rows]

        if not msgs:
            console.print("[yellow]Conversation is empty. Nothing to share.[/yellow]\n")
            conn.close()
            return

        share_token = str(uuid.uuid4())
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(f"{API_BASE}/api/share", json={
                    "share_token": share_token,
                    "title": self.conversation_title,
                    "model": "Cloud AI",
                    "messages": msgs
                })
                if res.status_code == 200:
                    data = res.json()
                    share_url = data.get("share_url") or f"{API_BASE}/share/{share_token}"
                    c.execute("UPDATE conversations SET share_token = ? WHERE id = ?", (share_token, self.conversation_id))
                    conn.commit()

                    panel_content = Group(
                        Text(f"Share Conversation: {self.conversation_title}", style="bold green"),
                        Text("• Public Link (Free & Worldwide):", style="white"),
                        Text(f"  {share_url}", style="bold yellow underline"),
                        Text(f"• Total Messages in Snapshot: {len(msgs)}", style="dim cyan"),
                        Text("Anyone with this link can view the conversation in their browser anywhere.", style="dim")
                    )
                    console.print(Panel(panel_content, title="◈ PUBLIC SHARE LINK", border_style="green", box=ROUNDED, padding=(1, 2)))
                    console.print()
                else:
                    console.print(f"[red]Failed to upload share snapshot:[/red] {res.text}\n")
        except Exception as e:
            console.print(f"[red]Share error:[/red] {e}\n")
        finally:
            conn.close()

    def export_to_excel(self):
        console.print("\n[bold cyan]Exporting Bodh AI database to Excel format...[/bold cyan]")
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        conv_file = EXPORT_DIR / "conversations.csv"
        c.execute("SELECT id, title, model, share_token, is_archived, created_at, updated_at FROM conversations ORDER BY created_at DESC")
        raw_convs = c.fetchall()
        conv_rows = []
        for r in raw_convs:
            cid, title, model, token, is_arch, created, updated = r
            slink = f"{API_BASE}/share/{token}" if token else "Not Shared (Use /share in Bodh AI)"
            conv_rows.append([cid, title, model, slink, is_arch, created, updated])

        with open(conv_file, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["Conversation ID", "Title", "Model", "Public Share Link (Worldwide)", "Is Archived", "Created At", "Updated At"])
            writer.writerows(conv_rows)

        msg_file = EXPORT_DIR / "messages.csv"
        c.execute("""
            SELECT m.id, m.conversation_id, c.title, m.role, m.content, m.tokens_used, m.created_at
            FROM messages m
            LEFT JOIN conversations c ON m.conversation_id = c.id
            ORDER BY m.created_at ASC
        """)
        msg_rows = c.fetchall()
        with open(msg_file, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["Message ID", "Conversation ID", "Conversation Title", "Role", "Content", "Tokens", "Timestamp"])
            writer.writerows(msg_rows)

        conn.close()

        panel_content = Group(
            Text("✓ Database Successfully Exported for Excel!", style="bold green"),
            Text(f"• Conversations Sheet: {conv_file} ({len(conv_rows)} rows)", style="white"),
            Text(f"• Messages Sheet:      {msg_file} ({len(msg_rows)} rows)", style="white"),
            Text("• Includes clickable Public Share Links for each conversation.", style="dim cyan"),
            Text("Opening conversations in Microsoft Excel...", style="dim yellow")
        )
        console.print(Panel(panel_content, title="◈ EXCEL EXPORT COMPLETED", border_style="green", box=ROUNDED, padding=(1, 2)))
        console.print()

        try:
            import subprocess
            if sys.platform == "win32":
                os.startfile(str(conv_file))
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(conv_file)])
            else:
                subprocess.Popen(["xdg-open", str(conv_file)])
        except Exception:
            pass

    async def search_web(self, query: str):
        query = query.strip()
        if not query:
            console.print("[yellow]Usage: /search <what you want to search>[/yellow]\n")
            return

        console.print(f"\n[bold cyan]🔍 Searching the live web for:[/bold cyan] [bold yellow]\"{query}\"[/bold yellow] ...")
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        results = []
        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                r = await client.post(url, headers=headers, data={"q": query})
                raw_html = r.text
                titles = re.findall(r'<h2 class="result__title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', raw_html)
                snippets = re.findall(r'<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)</a>', raw_html)
                count = min(len(titles), len(snippets), 5)
                for idx in range(count):
                    raw_u, t_raw = titles[idx]
                    s_raw = snippets[idx]
                    t = re.sub(r"<[^>]+>", "", t_raw).strip()
                    s = re.sub(r"<[^>]+>", "", s_raw).strip()
                    if "uddg=" in raw_u:
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_u).query).get("uddg", [""])[0]
                        u = urllib.parse.unquote(parsed) if parsed else raw_u
                    else:
                        u = raw_u
                    if t and s:
                        results.append({"title": html.unescape(t), "snippet": html.unescape(s), "url": u})
        except Exception:
            pass

        if not results:
            console.print("[yellow]No live search results found. Asking AI directly...[/yellow]\n")
            await self.stream_chat(query)
            return

        console.print(f"[dim green]✓ Found {len(results)} search sources. Synthesizing full response...[/dim green]\n")
        sources_text = ""
        for idx, r in enumerate(results, 1):
            sources_text += f"[{idx}] {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}\n\n"

        prompt = (
            f"User Query: {query}\n\n"
            f"Live Real-Time Web Search Context:\n{sources_text}\n"
            f"Instruction: Based on the latest real-time web search results above, provide a comprehensive, complete, and well-structured answer to '{query}'. Include facts, dates, details, and at the bottom provide a '### Sources' section with numbered markdown links."
        )
        await self.stream_chat(prompt)

    async def switch_provider(self, arg: str):
        target = arg.strip().lower()
        if target in ("local", "ollama"):
            self.provider = "local"
            console.print(f"[bold green]✓ Switched to Local Ollama ({OLLAMA_MODEL})[/bold green]\n")
        elif target in ("cloud", "cf", "cloudflare"):
            self.provider = "cloud"
            console.print("[bold green]✓ Switched to Cloudflare Workers AI (Llama 3.1 8B)[/bold green]\n")
        else:
            curr = "Local Ollama" if self.provider == "local" else "Cloudflare Workers AI"
            console.print(f"[cyan]Active Provider:[/cyan] [bold yellow]{curr}[/bold yellow]")
            console.print("[dim]Use /provider local or /provider cloud to switch[/dim]\n")

    async def generate_image(self, prompt: str):
        prompt = prompt.strip()
        if not prompt:
            console.print("[yellow]Usage: /image <describe what you want to generate>[/yellow]\n")
            return
        console.print(f"\n[cyan]Generating image with Cloud AI:[/cyan] [yellow]\"{prompt}\"[/yellow] ...")
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(f"{API_BASE}/api/generate-image", json={"prompt": prompt})
                if res.status_code == 200:
                    img_filename = f"image_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    img_path = IMAGE_DIR / img_filename
                    content_type = res.headers.get("content-type", "")
                    if "image" in content_type:
                        img_path.write_bytes(res.content)
                    else:
                        data = res.json()
                        if "image" in data:
                            import base64
                            img_path.write_bytes(base64.b64decode(data["image"]))
                    console.print(f"[bold green]✓ Image saved to:[/bold green] [yellow]{img_path}[/yellow]")
                    try:
                        webbrowser.open(str(img_path))
                    except Exception:
                        pass
                else:
                    console.print(f"[red]Image generation failed:[/red] {res.text}\n")
        except Exception as e:
            console.print(f"[red]Image generation error:[/red] {e}\n")

    async def analyze_vision(self, command_str: str):
        parts = command_str.strip().split(maxsplit=1)
        if not parts:
            console.print("[yellow]Usage: /vision <path-or-url-to-image> [question][/yellow]\n")
            return
        img_target = parts[0]
        question = parts[1] if len(parts) > 1 else "Describe this image in detail."
        console.print(f"\n[cyan]Analyzing image with Cloud Vision AI:[/cyan] [yellow]{img_target}[/yellow] ...")

        image_payload = img_target
        if os.path.exists(img_target):
            import base64
            with open(img_target, "rb") as f:
                image_payload = base64.b64encode(f.read()).decode("utf-8")

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(f"{API_BASE}/api/vision", json={"image": image_payload, "prompt": question})
                if res.status_code == 200:
                    data = res.json()
                    answer = data.get("response") or data.get("description") or "Analysis complete."
                    console.print(Panel(Markdown(answer), title="◈ Vision Analysis", border_style="cyan", box=ROUNDED, padding=(1, 2)))
                    console.print()
                else:
                    console.print(f"[red]Vision analysis failed:[/red] {res.text}\n")
        except Exception as e:
            console.print(f"[red]Vision analysis error:[/red] {e}\n")

    async def show_status(self):
        table = Table(title="◈ Bodh AI System Status", box=ROUNDED, border_style="cyan")
        table.add_column("Component", style="bold yellow")
        table.add_column("Status", style="bold")
        table.add_column("Details", style="dim")

        cloud_status = "[red]● OFFLINE[/red]"
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                r = await client.get(f"{API_BASE}/health")
                if r.status_code == 200:
                    cloud_status = "[green]● ONLINE[/green]"
        except Exception:
            pass

        ollama_status = "[yellow]● OFFLINE (Fallback Active)[/yellow]"
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(f"{OLLAMA_BASE}/api/tags")
                if r.status_code == 200:
                    ollama_status = "[green]● ONLINE[/green]"
        except Exception:
            pass

        table.add_row("Cloudflare Workers AI", cloud_status, API_BASE)
        table.add_row("Local Ollama Engine", ollama_status, f"{OLLAMA_BASE} ({OLLAMA_MODEL})")
        table.add_row("Active Provider", f"[cyan]{self.provider.upper()}[/cyan]", "Switch with /provider")
        table.add_row("Database Persistence", "[green]● READY[/green]", str(DB_PATH))
        table.add_row("Active Chat Session", f"[cyan]{self.conversation_title}[/cyan]", f"ID: {self.conversation_id or 'None'}")

        console.print()
        console.print(table)
        console.print()

    async def stream_chat(self, user_prompt: str):
        self.ensure_chat(user_prompt)
        self.save_message("user", user_prompt)
        self.last_user_prompt = user_prompt

        provider_name = "Cloud AI" if self.provider == "cloud" else "Local Ollama"
        time_str = datetime.datetime.now().strftime("%I:%M:%S %p").lstrip("0")
        header_text = Text()
        header_text.append("◈ BODH AI  ", style="bold cyan")
        header_text.append(f"[{provider_name}]  ", style="bold yellow")
        header_text.append(time_str, style="dim white")
        console.print(header_text)

        full_response = ""
        start_time = datetime.datetime.now()

        with Live(Spinner("dots", text="[cyan]Thinking & generating answer...[/cyan]"), console=console, refresh_per_second=10) as live:
            if self.provider == "local":
                try:
                    history = self.get_history()
                    hist_text = ""
                    for m in history[-6:]:
                        hist_text += f"{m['role'].upper()}: {m['content']}\n"
                    full_p = f"{hist_text}\nASSISTANT:"

                    async with httpx.AsyncClient(timeout=120.0) as client:
                        r = await client.post(f"{OLLAMA_BASE}/api/generate", json={"model": OLLAMA_MODEL, "prompt": full_p, "stream": False})
                        if r.status_code == 200:
                            data = r.json()
                            full_response = clean_response(data.get("response", ""))
                        else:
                            live.update(Text("Ollama error. Falling back to Cloud AI...", style="yellow"))
                            self.provider = "cloud"
                except Exception:
                    live.update(Text("Ollama offline. Falling back to Cloud AI...", style="yellow"))
                    self.provider = "cloud"

            if self.provider == "cloud" or not full_response:
                try:
                    history = self.get_history()
                    history_json = json.dumps(history[-6:])
                    encoded_q = urllib.parse.quote(user_prompt)
                    encoded_h = urllib.parse.quote(history_json)
                    url = f"{API_BASE}/api/chat?q={encoded_q}&history={encoded_h}"

                    async with httpx.AsyncClient(timeout=60.0) as client:
                        res = await client.get(url)
                        if res.status_code == 200:
                            data = res.json()
                            full_response = clean_response(data.get("response", ""))
                        else:
                            full_response = f"Cloud AI returned status {res.status_code}: {res.text}"
                except Exception as e:
                    full_response = f"Network error: {e}"

            elapsed = (datetime.datetime.now() - start_time).total_seconds()
            tokens_est = len(full_response.split())
            footer = f"✓ Done ({tokens_est} tokens • {elapsed:.1f}s)"

            panel = Panel(
                Markdown(full_response),
                border_style="cyan",
                box=ROUNDED,
                padding=(1, 2),
                subtitle=footer,
                subtitle_align="right"
            )
            live.update(panel)

        console.print()
        self.last_assistant_msg_id = self.save_message("assistant", full_response, tokens_est)

def print_banner(client: BodhAIClient):
    console.clear()
    provider_name = "Cloudflare Workers AI (Llama 3.1 8B)" if client.provider == "cloud" else f"Local Ollama ({OLLAMA_MODEL})"
    banner_text = Group(
        Text(LOGO, style="bold cyan"),
        Text("LOCAL & CLOUD AI TERMINAL ASSISTANT", style="bold magenta", justify="center"),
        Text(f"Active Provider: {provider_name}", style="dim", justify="center"),
        Text("Made with ❤️ by Aarush", style="bold yellow", justify="center"),
        Text("Type your prompt directly or /help for commands", style="dim", justify="center")
    )
    console.print(Panel(banner_text, border_style="cyan", box=ROUNDED, padding=(1, 2)))
    console.print()

def show_help():
    table = Table(title="◈ Bodh AI Commands", box=ROUNDED, border_style="cyan", show_header=True)
    table.add_column("Command", style="bold yellow", width=22)
    table.add_column("Description", style="white")

    table.add_row("/new", "Start a new conversation session")
    table.add_row("/history", "List past conversations (Today, Yesterday, Older)")
    table.add_row("/resume <#|id>", "Switch to a past conversation by number or ID")
    table.add_row("/rename <title>", "Rename the current conversation")
    table.add_row("/delete", "Delete the current conversation")
    table.add_row("/share", "Generate worldwide free public share link")
    table.add_row("/export", "Export database to Excel (.csv) & open in Excel")
    table.add_row("/search <query>", "Search the live web for real-time information")
    table.add_row("/provider [local|cloud]", "View or switch between Local Ollama & Cloud AI")
    table.add_row("/image <prompt>", "Generate AI image via Cloud Vision & Image Engine")
    table.add_row("/vision <path> [prompt]", "Analyze image using Cloud Vision AI")
    table.add_row("/continue", "Continue generating incomplete or stopped response")
    table.add_row("/regenerate", "Regenerate the last assistant response")
    table.add_row("/status", "Show engine & database connection status")
    table.add_row("/clear", "Clear terminal screen")
    table.add_row("/exit, quit", "Exit Bodh AI")

    console.print()
    console.print(table)
    console.print("[dim text-center]Made with [bold red]❤️[/bold red] by [bold yellow]Aarush[/bold yellow][/dim text-center]\n")

async def main():
    client = BodhAIClient()
    print_banner(client)

    while True:
        try:
            prompt_label = f"[bold cyan]BodhAI[/bold cyan] [dim]({client.conversation_title[:20]})[/dim] > "
            user_input = console.input(prompt_label).strip()

            if not user_input:
                continue

            lower = user_input.lower()

            if lower in ("/exit", "exit", "quit", ":q"):
                console.print("\n[bold cyan]Goodbye from Bodh AI![/bold cyan] [dim]Made with [bold red]❤️[/bold red] by [bold yellow]Aarush[/bold yellow][/dim]\n")
                break
            elif lower in ("/help", "help", "?"):
                show_help()
            elif lower in ("/clear", "cls", "clear"):
                print_banner(client)
            elif lower in ("/new", "/newchat"):
                client.start_new_chat()
            elif lower == "/history":
                client.list_history()
            elif lower.startswith("/resume"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                client.resume_chat(arg)
            elif lower.startswith("/rename"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                client.rename_current_chat(arg)
            elif lower.startswith("/delete"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                client.delete_chat(arg)
            elif lower == "/share":
                await client.share_current_chat()
            elif lower in ("/export", "/excel", "/csv"):
                client.export_to_excel()
            elif lower.startswith("/search"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await client.search_web(arg)
            elif lower.startswith("/provider"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await client.switch_provider(arg)
            elif lower.startswith("/image"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await client.generate_image(arg)
            elif lower.startswith("/vision"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await client.analyze_vision(arg)
            elif lower == "/status":
                await client.show_status()
            elif lower == "/continue":
                await client.stream_chat("Continue the previous response from where it stopped. Do not repeat previous sentences.")
            elif lower == "/regenerate":
                if client.last_user_prompt:
                    await client.stream_chat(client.last_user_prompt)
                else:
                    console.print("[yellow]No recent response to regenerate.[/yellow]\n")
            else:
                await client.stream_chat(user_input)
        except (KeyboardInterrupt, EOFError):
            break

if __name__ == "__main__":
    asyncio.run(main())

