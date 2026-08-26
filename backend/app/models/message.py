import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import utc_now


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'system', 'user', 'assistant'
    content = Column(Text, nullable=False, default="")
    status = Column(String(20), default="completed", nullable=False)  # 'streaming', 'completed', 'failed', 'interrupted'
    tokens_used = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
