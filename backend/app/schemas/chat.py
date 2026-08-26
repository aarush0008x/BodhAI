from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = Field(None, description="Optional UUID of the conversation")
    message: str = Field(..., min_length=1, max_length=50000, description="The user prompt")
    user_id: Optional[str] = Field(None, description="Optional user ID")
    model: Optional[str] = Field(None, description="Optional model override, e.g. qwen3:8b")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Sampling temperature")
    system_prompt: Optional[str] = Field(None, description="Optional custom system prompt")


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    model: str
    response: str
    status: str = "completed"


class StopRequest(BaseModel):
    message_id: str


class RegenerateRequest(BaseModel):
    conversation_id: str
    message_id: str


class ContinueRequest(BaseModel):
    conversation_id: str
    message_id: str


class StreamMessageStart(BaseModel):
    type: str = "message_start"
    conversation_id: str
    message_id: str
    user_message_id: str
    model: str


class StreamMessageDelta(BaseModel):
    type: str = "message_delta"
    content: str


class StreamMessageComplete(BaseModel):
    type: str = "message_complete"
    conversation_id: str
    message_id: str
    finish_reason: str = "stop"
    tokens_used: int = 0


class StreamError(BaseModel):
    type: str = "error"
    code: str
    message: str
