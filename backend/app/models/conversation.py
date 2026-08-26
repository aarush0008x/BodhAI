import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import utc_now


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), default="New Chat", nullable=False)
    model = Column(String(100), default="qwen3:8b", nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    last_message_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at.asc()")
    summary = relationship("ConversationSummary", back_populates="conversation", uselist=False, cascade="all, delete-orphan")
    shares = relationship("SharedConversation", back_populates="conversation", cascade="all, delete-orphan")
