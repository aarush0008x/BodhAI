from fastapi import FastAPI
from pydantic import BaseModel

from llm import chat


app = FastAPI(
    title="Bodh AI",
    description="Bodh AI — local AI assistant powered by Qwen3-8B",
    version="0.1.0"
)


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def root():
    return {
        "name": "Bodh AI",
        "status": "online",
        "model": "qwen3:8b"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "qwen3:8b",
        "engine": "Ollama"
    }


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):

    response = await chat(request.message)

    return {
        "model": "qwen3:8b",
        "response": response
    }