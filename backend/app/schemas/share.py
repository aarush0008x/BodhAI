from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ShareRequest(BaseModel):
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Expiration in days")


class ShareResponse(BaseModel):
    share_url: str
    share_token: str
    expires_at: Optional[datetime] = None
    is_active: bool = True


class SharedMessageView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    created_at: datetime


class SharedConversationView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    model: str
    created_at: datetime
    messages: List[SharedMessageView] = []
