import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils import utc_now


class ConversationSummary(Base):
    __tablename__ = "conversation_summaries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    summary = Column(Text, nullable=False, default="")
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    conversation = relationship("Conversation", back_populates="summary")
