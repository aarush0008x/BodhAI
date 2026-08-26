from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    status: str = "completed"
    tokens_used: int = 0
    created_at: datetime
    updated_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    title: str
    model: str
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime


class ConversationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    title: str
    model: str
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    messages: List[MessageResponse] = []


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    is_archived: Optional[bool] = None
