import uuid
import re
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.conversation import Conversation
from app.models.message import Message
from app.utils import utc_now


def generate_title_from_prompt(prompt: str) -> str:
    """Generate a clean title from the initial user prompt."""
    cleaned = re.sub(r"[#*_`\n\r]", " ", prompt).strip()
    words = cleaned.split()
    if not words:
        return "New Chat"
    title = " ".join(words[:6])
    if len(title) > 50:
        title = title[:47] + "..."
    return title.title()


def deduplicate_continuation(existing_text: str, continuation_text: str) -> str:
    """Safely combine existing text with continuation without duplicating overlapped words."""
    if not existing_text:
        return continuation_text
    if not continuation_text:
        return existing_text

    existing_stripped = existing_text.rstrip()
    continuation_stripped = continuation_text.lstrip()

    max_overlap = min(len(existing_stripped), len(continuation_stripped), 200)
    best_overlap = 0

    for i in range(10, max_overlap + 1):
        suffix = existing_stripped[-i:]
        prefix = continuation_stripped[:i]
        if suffix.lower() == prefix.lower():
            best_overlap = i

    if best_overlap > 0:
        return existing_stripped + continuation_stripped[best_overlap:]

    if existing_stripped and not existing_stripped.endswith((".", "!", "?", "\n", ":")):
        return existing_stripped + " " + continuation_stripped

    return existing_stripped + "\n\n" + continuation_stripped


class ConversationService:
    async def get_or_create_conversation(
        self,
        db: AsyncSession,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        initial_prompt: Optional[str] = None,
        model: Optional[str] = None
    ) -> Tuple[Conversation, bool]:
        """Retrieve existing conversation or create a new one, committed immediately."""
        if conversation_id:
            stmt = select(Conversation).where(Conversation.id == conversation_id)
            result = await db.execute(stmt)
            conv = result.scalar_one_or_none()
            if conv:
                return conv, False

        new_id = conversation_id or str(uuid.uuid4())
        title = generate_title_from_prompt(initial_prompt) if initial_prompt else "New Chat"
        now = utc_now()

        conv = Conversation(
            id=new_id,
            user_id=user_id,
            title=title,
            model=model or "qwen3:8b",
            is_archived=False,
            created_at=now,
            updated_at=now,
            last_message_at=now
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv, True

    async def save_user_message(
        self,
        db: AsyncSession,
        conversation_id: str,
        content: str
    ) -> Message:
        """Save user message, touch conversation timestamp, and commit to disk."""
        now = utc_now()
        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=content.strip(),
            status="completed",
            tokens_used=max(1, len(content) // 4),
            created_at=now,
            updated_at=now
        )
        db.add(msg)

        await db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(last_message_at=now, updated_at=now)
        )
        await db.commit()
        await db.refresh(msg)
        return msg

    async def create_assistant_placeholder(
        self,
        db: AsyncSession,
        conversation_id: str
    ) -> Message:
        """Create placeholder assistant message with status 'streaming'."""
        now = utc_now()
        msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            content="",
            status="streaming",
            tokens_used=0,
            created_at=now,
            updated_at=now
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    async def update_assistant_message(
        self,
        db: AsyncSession,
        message_id: str,
        content: str,
        status: str = "completed",
        tokens_used: int = 0
    ) -> Optional[Message]:
        """Update assistant message content, status, and tokens."""
        now = utc_now()
        stmt = (
            update(Message)
            .where(Message.id == message_id)
            .values(
                content=content,
                status=status,
                tokens_used=tokens_used or max(1, len(content) // 4),
                updated_at=now
            )
        )
        await db.execute(stmt)

        msg_stmt = select(Message).where(Message.id == message_id)
        res = await db.execute(msg_stmt)
        msg = res.scalar_one_or_none()

        if msg:
            await db.execute(
                update(Conversation)
                .where(Conversation.id == msg.conversation_id)
                .values(last_message_at=now, updated_at=now)
            )

        await db.commit()
        return msg

    async def mark_message_interrupted(
        self,
        db: AsyncSession,
        message_id: str,
        partial_content: str
    ) -> Optional[Message]:
        """Mark an assistant message as interrupted by the user."""
        return await self.update_assistant_message(
            db=db,
            message_id=message_id,
            content=partial_content,
            status="interrupted"
        )

    async def mark_message_failed(
        self,
        db: AsyncSession,
        message_id: str,
        error_text: str
    ) -> Optional[Message]:
        """Mark an assistant message as failed."""
        return await self.update_assistant_message(
            db=db,
            message_id=message_id,
            content=f"Error: {error_text}",
            status="failed"
        )

    async def get_conversation(
        self,
        db: AsyncSession,
        conversation_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Conversation]:
        """Get a single conversation by ID."""
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        if user_id:
            stmt = stmt.where(Conversation.user_id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_conversations(
        self,
        db: AsyncSession,
        user_id: Optional[str] = None,
        include_archived: bool = False,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None
    ) -> List[Conversation]:
        """List active conversations ordered by last_message_at desc."""
        stmt = (
            select(Conversation)
            .order_by(Conversation.last_message_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if not include_archived:
            stmt = stmt.where(Conversation.is_archived == False)  # noqa: E712
        if user_id:
            stmt = stmt.where(Conversation.user_id == user_id)
        if search:
            stmt = stmt.where(Conversation.title.ilike(f"%{search}%"))

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_messages(
        self,
        db: AsyncSession,
        conversation_id: str,
        limit: Optional[int] = None
    ) -> List[Message]:
        """Retrieve chronological messages for a conversation."""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        if limit:
            stmt = stmt.limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update_conversation(
        self,
        db: AsyncSession,
        conversation_id: str,
        title: Optional[str] = None,
        is_archived: Optional[bool] = None
    ) -> Optional[Conversation]:
        """Update conversation title or archive state."""
        now = utc_now()
        values = {"updated_at": now}
        if title is not None:
            values["title"] = title
        if is_archived is not None:
            values["is_archived"] = is_archived

        stmt = update(Conversation).where(Conversation.id == conversation_id).values(**values)
        await db.execute(stmt)
        await db.commit()
        return await self.get_conversation(db, conversation_id)

    async def delete_conversation(
        self,
        db: AsyncSession,
        conversation_id: str
    ) -> bool:
        """Delete a conversation and all cascaded messages."""
        stmt = delete(Conversation).where(Conversation.id == conversation_id)
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount > 0


conversation_service = ConversationService()
