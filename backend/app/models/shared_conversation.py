import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import utc_now


class SharedConversation(Base):
    __tablename__ = "shared_conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    conversation = relationship("Conversation", back_populates="shares")
