import json
import logging
import re
import base64
import os
import urllib.parse
from typing import AsyncGenerator, Dict, Any, List, Optional
import httpx
from app.config import settings

logger = logging.getLogger("bodhai.llm")

BODH_SYSTEM_PROMPT = """You are BodhAI, a professional AI assistant. Developed and trained by Aarush.

Formatting and presentation rules:
- Always format answers in clean, professional Markdown.
- Provide full-fledged, in-depth, and complete explanations.
- Never truncate, cut off, or abbreviate code blocks or explanations in the middle. Complete all code snippets fully.
- Use clear headings (#, ##, ###) when organizing information.
- Use bullet points for lists and numbered lists for sequential steps.
- Use **bold** for key concepts, terms, and emphasis.
- Use `inline code` for filenames, commands, variables, endpoints, and code symbols.
- Use fenced code blocks with the correct language identifier for code snippets.
- Use Markdown tables when comparing items or displaying structured data.
- For programming tasks, provide complete, correct, and runnable code with explanations.
- Keep responses comprehensive, accurate, structured, and easy to read.
- Never reveal private chain-of-thought or raw <think> tags. Provide concise, direct answers.
"""

CLOUD_BASE_URL = "https://api.bodhai.aarushdevworld.workers.dev"
CLOUD_CHAT_ENDPOINT = f"{CLOUD_BASE_URL}/api/chat"
CLOUD_VISION_ENDPOINT = f"{CLOUD_BASE_URL}/api/vision"
CLOUD_IMAGE_ENDPOINT = f"{CLOUD_BASE_URL}/api/generate-image"


def clean_response(text: Optional[str]) -> str:
    """Strips thinking tags and excessive whitespace from model output."""
    if not text:
        return ""

    text = str(text)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<think>.*$", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"\n{4,}", "\n\n", text)
    return text.strip()


class OllamaException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class BodhLLMService:
    def __init__(
        self,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.default_model = default_model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT
        # Default to high-speed Cloud API, with Ollama available
        self.active_provider = "cloud"

    async def check_health(self) -> Dict[str, Any]:
        """Check Ollama availability and installed models."""
        ollama_online = False
        model_found = False
        models = []

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    model_found = any(self.default_model in m for m in models)
                    ollama_online = True
        except Exception:
            ollama_online = False

        return {
            "online": ollama_online,
            "engine": "Cloudflare Workers AI (Fast Cloud API)" if self.active_provider == "cloud" else "Ollama Local (Qwen3-8B)",
            "provider": self.active_provider,
            "model": self.default_model,
            "model_installed": model_found,
            "available_models": models,
            "cloud_endpoint": CLOUD_BASE_URL
        }

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        num_predict: Optional[int] = None,
        provider: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream responses with high-speed Cloud API and Local Ollama fallback."""
        target_provider = provider or self.active_provider
        target_model = model or self.default_model
        target_temp = temperature if temperature is not None else settings.OLLAMA_TEMPERATURE
        target_predict = num_predict or settings.OLLAMA_NUM_PREDICT

        # 1. Primary: High-Speed Cloudflare Workers AI API
        if target_provider == "cloud":
            # Build context-aware prompt from conversation history
            user_prompt = ""
            non_system = [m for m in messages if m.get("role") != "system"]

            if len(non_system) > 1:
                history_blocks = []
                for m in non_system[-6:]:
                    r = "User" if m.get("role") == "user" else "Assistant"
                    history_blocks.append(f"{r}: {m.get('content', '').strip()}")
                user_prompt = "Context History:\n" + "\n\n".join(history_blocks) + "\n\nInstruction: Provide a full-fledged, complete, and exhaustive response completing all explanations and code thoroughly."
            elif len(non_system) == 1:
                user_prompt = non_system[0].get("content", "")
            else:
                user_prompt = messages[-1].get("content", "") if messages else ""

            try:
                encoded_prompt = urllib.parse.quote(user_prompt)
                cloud_url = f"{CLOUD_CHAT_ENDPOINT}?q={encoded_prompt}"

                async with httpx.AsyncClient(timeout=45.0) as client:
                    res = await client.get(cloud_url)
                    if res.status_code == 200:
                        try:
                            data = res.json()
                            raw_text = data.get("response") or data.get("content") or data.get("text") or str(data)
                        except Exception:
                            raw_text = res.text

                        cleaned_text = clean_response(raw_text)
                        # Smooth fast streaming chunks
                        words = cleaned_text.split(" ")
                        for idx, w in enumerate(words):
                            chunk = w + (" " if idx < len(words) - 1 else "")
                            yield {
                                "content": chunk,
                                "done": False,
                                "eval_count": len(words),
                                "provider": "cloud"
                            }
                            import asyncio
                            await asyncio.sleep(0.012)  # Natural fast reading stream pace

                        yield {
                            "content": "",
                            "done": True,
                            "eval_count": len(words),
                            "done_reason": "stop",
                            "provider": "cloud"
                        }
                        return
                    else:
                        logger.warning(f"Cloud API returned {res.status_code}, falling back to Local Ollama...")
                        target_provider = "local"
            except Exception as e:
                logger.warning(f"Cloud API error ({e}), falling back to Local Ollama...")
                target_provider = "local"

        # 2. Local Ollama (Qwen3-8B)
        try:
            payload = {
                "model": target_model,
                "messages": messages,
                "stream": True,
                "options": {
                    "num_predict": target_predict,
                    "temperature": target_temp,
                }
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        raise OllamaException(
                            "OLLAMA_HTTP_ERROR",
                            f"Ollama HTTP {response.status_code}: {error_body.decode('utf-8', errors='ignore')}",
                            status_code=response.status_code
                        )

                    async for line in response.aiter_lines():
                        if not line or not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        msg_obj = chunk.get("message", {})
                        content_piece = msg_obj.get("content", "")
                        is_done = chunk.get("done", False)

                        yield {
                            "content": content_piece,
                            "done": is_done,
                            "eval_count": chunk.get("eval_count", 0),
                            "done_reason": chunk.get("done_reason", "stop") if is_done else None,
                            "provider": "local"
                        }
                        if is_done:
                            return
        except Exception as e:
            raise OllamaException("PROVIDER_ERROR", f"Inference failed: {e}")

    async def generate_image(self, prompt: str) -> Dict[str, Any]:
        """Generate AI image via Cloudflare Workers AI."""
        try:
            encoded_prompt = urllib.parse.quote(prompt)
            url = f"{CLOUD_IMAGE_ENDPOINT}?prompt={encoded_prompt}"
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    try:
                        data = res.json()
                        return {"success": True, "data": data}
                    except Exception:
                        return {"success": True, "image_bytes": res.content}
                else:
                    return {"success": False, "error": f"HTTP {res.status_code}: {res.text[:200]}"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def analyze_vision(self, image_data: str, question: Optional[str] = None) -> Dict[str, Any]:
        """Analyze image via Cloudflare Workers Vision API."""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                payload = {
                    "image": image_data,
                    "prompt": question or "Describe this image in detail."
                }
                res = await client.post(
                    CLOUD_VISION_ENDPOINT,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    try:
                        return {"success": True, "data": res.json()}
                    except Exception:
                        return {"success": True, "response": res.text}
                else:
                    return {"success": False, "error": f"HTTP {res.status_code}: {res.text[:200]}"}
        except Exception as e:
            return {"success": False, "error": str(e)}


llm_service = BodhLLMService()
