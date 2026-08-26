import asyncio
import os
import sys
import re
import uuid
import webbrowser
from datetime import datetime, timezone
from pathlib import Path
try:
    import readline
except ImportError:
    pass

# Ensure backend root directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from rich.console import Console, Group
from rich.panel import Panel
from rich.markdown import Markdown
from rich.text import Text
from rich.table import Table
from rich.rule import Rule
from rich.box import ROUNDED
from rich.live import Live

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.services.llm import (
    llm_service,
    clean_response,
    BODH_SYSTEM_PROMPT,
    OllamaException,
    CLOUD_BASE_URL,
)
from app.services.context_manager import context_manager
from app.services.conversation_service import (
    conversation_service,
    generate_title_from_prompt,
    deduplicate_continuation,
)
from app.services.sharing_service import sharing_service
from app.services.search_service import search_service

import csv
import sqlite3

console = Console()

IMAGE_DIR = Path.home() / "BodhAI" / "generated_images"
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

EXPORT_DIR = Path.home() / "BodhAI" / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

LOGO = r"""
 ██████╗  ██████╗ ██████╗ ██╗  ██╗     █████╗ ██╗
 ██╔══██╗██╔═══██╗██╔══██╗██║  ██║    ██╔══██╗██║
 ██████╔╝██║   ██║██║  ██║███████║    ███████║██║
 ██╔══██╗██║   ██║██║  ██║██╔══██║    ██╔══██║██║
 ██████╔╝╚██████╔╝██████╔╝██║  ██║    ██║  ██║██║
 ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
"""


def current_time_str():
    return datetime.now().strftime("%I:%M:%S %p").lstrip("0")


def print_banner():
    console.clear()
    provider_name = "Ollama Local (Qwen3-8B)" if llm_service.active_provider == "local" else "Cloudflare Workers AI"
    banner_text = Group(
        Text(LOGO, style="bold cyan"),
        Text("LOCAL & CLOUD AI TERMINAL ASSISTANT", style="bold magenta", justify="center"),
        Text(f"Active Provider: {provider_name} • v{settings.VERSION}", style="dim", justify="center"),
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
    table.add_row("/search <query>", "Search the live web for real-time information")
    table.add_row("/export", "Export database to Excel (.csv) & open in Excel")
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


class BodhAICLI:
    def __init__(self):
        self.conversation_id = None
        self.conversation_title = "New Chat"
        self.last_assistant_msg_id = None
        self.last_user_prompt = None

    async def initialize(self):
        await init_db()

    async def start_new_chat(self):
        self.conversation_id = None
        self.conversation_title = "New Chat"
        self.last_assistant_msg_id = None
        self.last_user_prompt = None
        console.print("[bold green]✓ Started a new conversation session.[/bold green]\n")

    async def stream_user_prompt(self, prompt: str):
        prompt = prompt.strip()
        if not prompt:
            return

        self.last_user_prompt = prompt

        async with AsyncSessionLocal() as db:
            # Get or create conversation in database
            conv, is_new = await conversation_service.get_or_create_conversation(
                db=db,
                conversation_id=self.conversation_id,
                initial_prompt=prompt,
                model=settings.OLLAMA_MODEL
            )
            self.conversation_id = conv.id
            self.conversation_title = conv.title

            # Save user message (committed to disk)
            user_msg = await conversation_service.save_user_message(db, conv.id, prompt)

            # Create assistant placeholder
            assistant_msg = await conversation_service.create_assistant_placeholder(db, conv.id)
            self.last_assistant_msg_id = assistant_msg.id

            # Build memory managed context
            context_msgs = await context_manager.build_context_messages(
                db=db,
                conversation_id=conv.id,
                current_user_message=prompt
            )

        # Header for AI response
        console.print()
        header_text = Text()
        header_text.append("◈ BODH AI  ", style="bold cyan")
        provider_badge = "Ollama Local" if llm_service.active_provider == "local" else "Cloud AI"
        header_text.append(f"[{provider_badge}]  ", style="yellow")
        header_text.append(current_time_str(), style="dim")
        console.print(Rule(header_text, style="cyan"))
        console.print()

        accumulated_text = ""
        total_tokens = 0
        finish_reason = "stop"
        start_time = datetime.now()

        spinner_frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        frame_idx = 0

        try:
            generator = llm_service.stream_chat(
                messages=context_msgs,
                model=settings.OLLAMA_MODEL
            )

            # Live terminal stream rendering with animated loader
            with Live(console=console, refresh_per_second=12, transient=False) as live:
                initial_spinner = Text()
                initial_spinner.append("⠋ ", style="bold yellow")
                initial_spinner.append("Bodh AI is thinking... ", style="bold cyan")
                initial_spinner.append(f"[{provider_badge}]", style="dim")
                live.update(
                    Panel(
                        initial_spinner,
                        border_style="cyan",
                        box=ROUNDED,
                        padding=(1, 2)
                    )
                )

                async for chunk_data in generator:
                    frame_idx = (frame_idx + 1) % len(spinner_frames)
                    current_spinner = spinner_frames[frame_idx]

                    chunk = chunk_data.get("content", "")
                    if chunk:
                        accumulated_text += chunk
                        cleaned_preview = clean_response(accumulated_text)

                        approx_tokens = max(1, len(cleaned_preview) // 4)
                        subtitle_text = f"[bold yellow]{current_spinner}[/bold yellow] [dim cyan]Generating response...[/dim cyan] [dim]({approx_tokens} tokens)[/dim]"

                        live.update(
                            Panel(
                                Markdown(cleaned_preview if cleaned_preview else "..."),
                                border_style="cyan",
                                box=ROUNDED,
                                padding=(1, 2),
                                subtitle=subtitle_text,
                                subtitle_align="right"
                            )
                        )

                    if chunk_data.get("done"):
                        finish_reason = chunk_data.get("done_reason", "stop")
                        total_tokens = chunk_data.get("eval_count", 0)

                # Final update on completion
                final_clean = clean_response(accumulated_text)
                elapsed = (datetime.now() - start_time).total_seconds()
                tok_count = total_tokens or max(1, len(final_clean) // 4)
                done_subtitle = f"[bold green]✓ Done[/bold green] [dim]({tok_count} tokens • {elapsed:.1f}s)[/dim]"

                live.update(
                    Panel(
                        Markdown(final_clean if final_clean else "No response generated."),
                        border_style="cyan",
                        box=ROUNDED,
                        padding=(1, 2),
                        subtitle=done_subtitle,
                        subtitle_align="right"
                    )
                )

            # Save final assistant message to DB
            async with AsyncSessionLocal() as db:
                await conversation_service.update_assistant_message(
                    db=db,
                    message_id=assistant_msg.id,
                    content=final_clean,
                    status="completed",
                    tokens_used=tok_count
                )

            console.print()

        except (KeyboardInterrupt, asyncio.CancelledError):
            console.print("\n[yellow]Generation interrupted by user.[/yellow]")
            async with AsyncSessionLocal() as db:
                await conversation_service.mark_message_interrupted(
                    db=db,
                    message_id=assistant_msg.id,
                    partial_content=clean_response(accumulated_text)
                )
            console.print()
        except OllamaException as e:
            console.print(f"\n[bold red]Error ({e.code}):[/bold red] {e.message}\n")
        except Exception as e:
            console.print(f"\n[bold red]Error:[/bold red] {e}\n")

    async def list_history(self):
        async with AsyncSessionLocal() as db:
            convs = await conversation_service.list_conversations(db=db, limit=30)

        if not convs:
            console.print("[dim]No previous conversations saved in database yet.[/dim]\n")
            return

        table = Table(title="◈ Saved Conversation History", box=ROUNDED, border_style="cyan")
        table.add_column("#", style="bold yellow", width=4)
        table.add_column("Title", style="white", width=40)
        table.add_column("Last Active", style="dim", width=20)
        table.add_column("ID", style="dim", width=36)

        for idx, c in enumerate(convs, 1):
            is_current = "[green]● [/green]" if c.id == self.conversation_id else "  "
            time_fmt = c.last_message_at.strftime("%b %d, %I:%M %p") if c.last_message_at else ""
            table.add_row(f"{is_current}{idx}", c.title, time_fmt, c.id)

        console.print()
        console.print(table)
        console.print("[dim]Use /resume <number-or-id> to continue any chat.[/dim]\n")

    async def resume_chat(self, arg: str):
        target = arg.strip()
        if not target:
            console.print("[yellow]Usage: /resume <number-or-id>[/yellow]\n")
            return

        async with AsyncSessionLocal() as db:
            convs = await conversation_service.list_conversations(db=db, limit=30)

            matched_conv = None
            if target.isdigit():
                idx = int(target) - 1
                if 0 <= idx < len(convs):
                    matched_conv = convs[idx]
            else:
                for c in convs:
                    if c.id.startswith(target):
                        matched_conv = c
                        break

            if not matched_conv:
                console.print("[red]Conversation not found.[/red]\n")
                return

            self.conversation_id = matched_conv.id
            self.conversation_title = matched_conv.title
            messages = await conversation_service.get_messages(db, matched_conv.id)

        console.print(f"[bold green]✓ Resumed: {matched_conv.title}[/bold green]")
        console.print(f"[dim]Loaded {len(messages)} messages from history.[/dim]\n")

    async def rename_current_chat(self, new_title: str):
        if not self.conversation_id:
            console.print("[yellow]No active conversation to rename.[/yellow]\n")
            return

        new_title = new_title.strip()
        if not new_title:
            console.print("[yellow]Usage: /rename <new-title>[/yellow]\n")
            return

        async with AsyncSessionLocal() as db:
            await conversation_service.update_conversation(db, self.conversation_id, title=new_title)
        self.conversation_title = new_title
        console.print(f"[bold green]✓ Conversation renamed to: {new_title}[/bold green]\n")

    async def delete_current_chat(self, arg: str = ""):
        target_id = self.conversation_id
        if arg.strip():
            arg_clean = arg.strip().lstrip("#")
            async with AsyncSessionLocal() as db:
                convs = await conversation_service.list_conversations(db, limit=50)
                if arg_clean.isdigit():
                    idx = int(arg_clean) - 1
                    if 0 <= idx < len(convs):
                        target_id = convs[idx].id
                else:
                    for c in convs:
                        if c.id.startswith(arg_clean):
                            target_id = c.id
                            break

        if not target_id:
            console.print("[yellow]No active conversation to delete.[/yellow]\n")
            return

        async with AsyncSessionLocal() as db:
            await conversation_service.delete_conversation(db, target_id)

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

        async with AsyncSessionLocal() as db:
            share_info = await sharing_service.create_or_get_share_link(
                db=db,
                conversation_id=self.conversation_id,
                expires_in_days=30
            )
            messages = await conversation_service.get_messages(db, self.conversation_id)

        console.print()
        panel_content = Group(
            Text(f"Share Conversation: {self.conversation_title}", style="bold green"),
            Text(f"• Public Link (Free & Worldwide):", style="white"),
            Text(f"  {share_info['share_url']}", style="bold yellow underline"),
            Text(f"• Total Messages in Snapshot: {len(messages)}", style="dim cyan"),
            Text("Anyone with this link can view the conversation in their browser anywhere in the world.", style="dim")
        )
        console.print(Panel(panel_content, title="◈ PUBLIC SHARE LINK", border_style="green", box=ROUNDED, padding=(1, 2)))
        console.print()

    async def generate_image(self, prompt: str):
        prompt = prompt.strip()
        if not prompt:
            console.print("[yellow]Usage: /image <describe what you want to generate>[/yellow]\n")
            return

        console.print(f"\n[cyan]Generating image with Cloud AI:[/cyan] [yellow]\"{prompt}\"[/yellow] ...")
        res = await llm_service.generate_image(prompt)

        if res.get("success"):
            img_filename = f"image_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            img_path = IMAGE_DIR / img_filename

            if "image_bytes" in res:
                img_path.write_bytes(res["image_bytes"])
            elif "data" in res:
                img_data = res["data"]
                if isinstance(img_data, dict) and "image" in img_data:
                    import base64
                    img_bytes = base64.b64decode(img_data["image"])
                    img_path.write_bytes(img_bytes)

            console.print(f"[bold green]✓ Image saved to:[/bold green] [yellow]{img_path}[/yellow]")
            try:
                webbrowser.open(str(img_path))
            except Exception:
                pass
        else:
            console.print(f"[red]Image generation failed:[/red] {res.get('error', 'Unknown error')}\n")

    async def analyze_vision(self, command_str: str):
        parts = command_str.strip().split(maxsplit=1)
        if not parts:
            console.print("[yellow]Usage: /vision <path-or-url-to-image> [question][/yellow]\n")
            return

        img_target = parts[0]
        question = parts[1] if len(parts) > 1 else "Describe this image in detail."

        console.print(f"\n[cyan]Analyzing image with Cloud Vision AI:[/cyan] [yellow]{img_target}[/yellow] ...")
        # Load local image as base64 if local file
        image_payload = img_target
        if os.path.exists(img_target):
            import base64
            with open(img_target, "rb") as f:
                image_payload = base64.b64encode(f.read()).decode("utf-8")

        res = await llm_service.analyze_vision(image_payload, question)
        if res.get("success"):
            data = res.get("data") or {}
            answer = data.get("response") or res.get("response") or "Analysis completed."
            console.print(Panel(Markdown(answer), title="◈ Vision Analysis", border_style="cyan", box=ROUNDED, padding=(1, 2)))
            console.print()
        else:
            console.print(f"[red]Vision analysis failed:[/red] {res.get('error', 'Unknown error')}\n")

    async def web_search(self, query: str):
        query = query.strip()
        if not query:
            console.print("[yellow]Usage: /search <what you want to search>[/yellow]\n")
            return

        console.print(f"\n[bold cyan]🔍 Searching the live web for:[/bold cyan] [bold yellow]\"{query}\"[/bold yellow] ...")
        results = await search_service.search(query, max_results=5)

        if not results:
            console.print("[yellow]No live web search results found. Asking AI directly...[/yellow]\n")
            await self.stream_user_prompt(query)
            return

        console.print(f"[dim green]✓ Found {len(results)} live search sources. Synthesizing full response...[/dim green]\n")

        sources_text = ""
        for idx, r in enumerate(results, 1):
            sources_text += f"[{idx}] {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}\n\n"

        search_prompt = (
            f"User Query: {query}\n\n"
            f"Live Real-Time Web Search Context:\n{sources_text}\n"
            f"Instruction: Based on the latest real-time web search results above, provide a comprehensive, complete, and well-structured answer to '{query}'. Include facts, dates, details, and at the bottom provide a '### Sources' section with numbered markdown links."
        )

        await self.stream_user_prompt(search_prompt)

    async def switch_provider(self, arg: str):
        target = arg.strip().lower()
        if target in ("local", "ollama", "qwen", "1"):
            llm_service.active_provider = "local"
            console.print("[bold green]✓ Switched active provider to Local Ollama (Qwen3-8B).[/bold green]\n")
        elif target in ("cloud", "workers", "cloudflare", "api", "2"):
            llm_service.active_provider = "cloud"
            console.print("[bold green]✓ Switched active provider to Cloudflare Workers AI.[/bold green]\n")
        else:
            current = "Local Ollama (Qwen3-8B)" if llm_service.active_provider == "local" else "Cloudflare Workers AI"
            console.print(f"[cyan]Current Provider:[/cyan] [bold yellow]{current}[/bold yellow]")
            console.print("[dim]Usage to switch: /provider local  or  /provider cloud[/dim]\n")

    async def show_status(self):
        health = await llm_service.check_health()
        status_table = Table(title="◈ System Status", box=ROUNDED, border_style="cyan")
        status_table.add_column("Component", style="bold white")
        status_table.add_column("Status", style="bold")
        status_table.add_column("Details", style="dim")

        if health.get("online"):
            status_table.add_row("Ollama Engine", "[green]● ONLINE[/green]", f"{settings.OLLAMA_BASE_URL}")
            status_table.add_row("Qwen3-8B Model", "[green]● READY[/green]" if health.get("model_installed") else "[yellow]● NOT CACHED[/yellow]", f"Target: {settings.OLLAMA_MODEL}")
        else:
            status_table.add_row("Ollama Engine", "[yellow]● OFFLINE (Auto-fallback to Cloud AI)[/yellow]", "Cloudflare Workers AI active")

        status_table.add_row("Active Provider", f"[cyan]{llm_service.active_provider.upper()}[/cyan]", "Switch with /provider")
        status_table.add_row("Cloud API", "[green]● CONNECTED[/green]", CLOUD_BASE_URL)
        status_table.add_row("Database", "[green]● PERSISTENT[/green]", "SQLite Local with Connection Pooling")
        status_table.add_row("Active Chat", f"[cyan]{self.conversation_title}[/cyan]", f"ID: {self.conversation_id or 'None'}")

        console.print()
        console.print(status_table)
        console.print()

    async def export_to_excel(self):
        console.print("\n[bold cyan]Exporting Bodh AI database to Excel format...[/bold cyan]")
        db_file = os.path.join(backend_dir, "bodhai.db") if os.path.exists(os.path.join(backend_dir, "bodhai.db")) else "bodhai.db"

        try:
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()

            # 1. Export Conversations with Public Share Links
            conv_file = EXPORT_DIR / "conversations.csv"
            cursor.execute("""
                SELECT 
                    c.id, 
                    c.title, 
                    c.model, 
                    s.share_token,
                    c.is_archived, 
                    c.created_at, 
                    c.updated_at, 
                    c.last_message_at
                FROM conversations c
                LEFT JOIN shared_conversations s 
                    ON c.id = s.conversation_id AND s.is_active = 1
                ORDER BY c.created_at DESC
            """)
            raw_convs = cursor.fetchall()
            conv_rows = []
            for r in raw_convs:
                cid, title, model, token, is_arch, created, updated, last_msg = r
                share_link = f"https://api.bodhai.aarushdevworld.workers.dev/share/{token}" if token else "Not Shared (Use /share in Bodh AI)"
                conv_rows.append([cid, title, model, share_link, is_arch, created, updated, last_msg])

            with open(conv_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(["Conversation ID", "Title", "Model", "Public Share Link (Worldwide)", "Is Archived", "Created At", "Updated At", "Last Message At"])
                writer.writerows(conv_rows)

            # 2. Export Messages with Conversation Title
            msg_file = EXPORT_DIR / "messages.csv"
            cursor.execute("""
                SELECT 
                    m.id, 
                    m.conversation_id, 
                    c.title,
                    m.role, 
                    m.content, 
                    m.status, 
                    m.tokens_used, 
                    m.created_at 
                FROM messages m
                LEFT JOIN conversations c ON m.conversation_id = c.id
                ORDER BY m.created_at ASC
            """)
            msg_rows = cursor.fetchall()
            with open(msg_file, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                writer.writerow(["Message ID", "Conversation ID", "Conversation Title", "Role (User / Assistant)", "Message Content", "Status", "Tokens Used", "Timestamp"])
                writer.writerows(msg_rows)

            conn.close()

            panel_content = Group(
                Text("✓ Database Successfully Exported with Public Share Links!", style="bold green"),
                Text(f"• Conversations Sheet: {conv_file} ({len(conv_rows)} conversations)", style="white"),
                Text(f"• Messages Sheet:      {msg_file} ({len(msg_rows)} messages)", style="white"),
                Text("• Includes clickable Public Share Links for each conversation.", style="dim cyan"),
                Text("Opening conversations in Microsoft Excel...", style="dim yellow")
            )
            console.print(Panel(panel_content, title="◈ EXCEL EXPORT COMPLETED", border_style="green", box=ROUNDED, padding=(1, 2)))
            console.print()

            try:
                os.startfile(str(conv_file))
            except Exception:
                pass
        except Exception as e:
            console.print(f"[red]Export failed:[/red] {e}\n")


async def main_loop():
    cli = BodhAICLI()
    print_banner()
    console.print("[dim]Initializing database and checking AI engine...[/dim]")
    await cli.initialize()
    console.print("[bold green]● Ready.[/bold green]\n")

    while True:
        try:
            prompt_label = f"[bold cyan]BodhAI[/bold cyan] [dim]({cli.conversation_title[:20]})[/dim] > "
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
                print_banner()

            elif lower in ("/new", "/newchat"):
                await cli.start_new_chat()

            elif lower == "/history":
                await cli.list_history()

            elif lower.startswith("/resume"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await cli.resume_chat(arg)

            elif lower.startswith("/rename"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await cli.rename_current_chat(arg)

            elif lower.startswith("/delete"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await cli.delete_current_chat(arg)

            elif lower == "/share":
                await cli.share_current_chat()

            elif lower in ("/export", "/excel", "/csv"):
                await cli.export_to_excel()

            elif lower.startswith("/search"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await cli.web_search(arg)

            elif lower.startswith("/provider"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await cli.switch_provider(arg)

            elif lower.startswith("/image"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await cli.generate_image(arg)

            elif lower.startswith("/vision"):
                parts = user_input.split(maxsplit=1)
                arg = parts[1] if len(parts) > 1 else ""
                await cli.analyze_vision(arg)

            elif lower == "/status":
                await cli.show_status()

            elif lower == "/continue":
                if cli.last_assistant_msg_id:
                    console.print("[cyan]Continuing previous generation...[/cyan]")
                    await cli.stream_user_prompt("Continue the previous response from where it stopped. Do not repeat previous sentences.")
                else:
                    console.print("[yellow]No recent response to continue.[/yellow]\n")

            elif lower == "/regenerate":
                if cli.last_user_prompt:
                    console.print("[cyan]Regenerating last response...[/cyan]")
                    await cli.stream_user_prompt(cli.last_user_prompt)
                else:
                    console.print("[yellow]No previous user message to regenerate.[/yellow]\n")

            else:
                await cli.stream_user_prompt(user_input)

        except (KeyboardInterrupt, asyncio.CancelledError):
            console.print("\n[dim]Use /exit to quit.[/dim]\n")
        except EOFError:
            break


def main():
    try:
        asyncio.run(main_loop())
    except (KeyboardInterrupt, asyncio.CancelledError):
        pass


if __name__ == "__main__":
    main()
