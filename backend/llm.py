import httpx

OLLAMA_URL = "http://127.0.0.1:11434"
MODEL = "qwen3:8b"

BODH_SYSTEM_PROMPT = """
You are Bodh, a general-purpose AI assistant.

Your name is Bodh AI.

You are helpful, clear, accurate, and honest. Answer questions directly
and explain things when useful.

You can help with:
- General knowledge
- Reasoning
- Mathematics
- Programming
- Writing
- Summarization
- Learning and explanations
- Multiple languages

Do not claim to have capabilities or access that you do not actually have.

You are currently running locally through Ollama using Qwen3-8B.
Do not introduce yourself as Qwen unless the user specifically asks which
underlying model powers you.

When the user asks who you are, identify yourself as Bodh AI and, if useful,
explain that Bodh currently uses Qwen3-8B as its underlying model.
"""


async def chat(message: str):
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": BODH_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": message
            }
        ],
        "stream": False
    }

    async with httpx.AsyncClient(timeout=300) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json=payload
        )

    response.raise_for_status()

    data = response.json()

    return data["message"]["content"]