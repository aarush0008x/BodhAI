import secrets
import uuid
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.config import settings
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.shared_conversation import SharedConversation
from app.utils import utc_now

CLOUD_SHARE_API = "https://api.bodhai.aarushdevworld.workers.dev/api/share"


class SharingService:
    async def create_or_get_share_link(
        self,
        db: AsyncSession,
        conversation_id: str,
        created_by: Optional[str] = None,
        expires_in_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Create a new public share link (uploading snapshot to Cloudflare edge so it is accessible worldwide).
        """
        now = utc_now()

        # Check for existing active share token
        stmt = (
            select(SharedConversation)
            .where(
                SharedConversation.conversation_id == conversation_id,
                SharedConversation.is_active == True  # noqa: E712
            )
            .order_by(SharedConversation.created_at.desc())
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()

        token = existing.share_token if existing else secrets.token_urlsafe(32)
        expires_at = existing.expires_at if existing else (now + timedelta(days=expires_in_days) if expires_in_days else None)

        if not existing:
            shared = SharedConversation(
                id=str(uuid.uuid4()),
                conversation_id=conversation_id,
                share_token=token,
                created_by=created_by,
                created_at=now,
                expires_at=expires_at,
                is_active=True
            )
            db.add(shared)
            await db.commit()

        # Fetch conversation and messages to upload to cloud edge
        conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
        conv_res = await db.execute(conv_stmt)
        conv = conv_res.scalar_one_or_none()

        msg_stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        msg_res = await db.execute(msg_stmt)
        messages = [
            {"role": m.role, "content": m.content, "created_at": str(m.created_at)}
            for m in msg_res.scalars().all()
        ]

        # Upload snapshot to Cloudflare Worker
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    CLOUD_SHARE_API,
                    json={
                        "share_token": token,
                        "title": conv.title if conv else "Shared Chat",
                        "model": conv.model if conv else "Bodh AI",
                        "messages": messages
                    }
                )
        except Exception:
            pass

        public_share_url = f"https://api.bodhai.aarushdevworld.workers.dev/share/{token}"
        return {
            "share_url": public_share_url,
            "public_url": public_share_url,
            "share_token": token,
            "expires_at": expires_at,
            "is_active": True
        }

    async def get_shared_conversation(
        self,
        db: AsyncSession,
        share_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve read-only sanitized conversation data by share token.
        """
        now = utc_now()
        stmt = (
            select(SharedConversation)
            .where(
                SharedConversation.share_token == share_token,
                SharedConversation.is_active == True  # noqa: E712
            )
        )
        res = await db.execute(stmt)
        share_record = res.scalar_one_or_none()

        if not share_record:
            return None

        # Check expiration
        exp = share_record.expires_at.replace(tzinfo=None) if share_record.expires_at else None
        if exp and exp < now:
            return None

        # Fetch conversation
        conv_stmt = select(Conversation).where(Conversation.id == share_record.conversation_id)
        conv_res = await db.execute(conv_stmt)
        conv = conv_res.scalar_one_or_none()

        if not conv:
            return None

        # Fetch messages
        msg_stmt = (
            select(Message)
            .where(
                Message.conversation_id == conv.id,
                Message.status == "completed"
            )
            .order_by(Message.created_at.asc())
        )
        msg_res = await db.execute(msg_stmt)
        messages = list(msg_res.scalars().all())

        return {
            "title": conv.title,
            "model": conv.model,
            "created_at": conv.created_at,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at
                }
                for m in messages
            ]
        }

    async def disable_share_link(
        self,
        db: AsyncSession,
        conversation_id: str
    ) -> bool:
        """
        Deactivate share link for a conversation.
        """
        stmt = (
            update(SharedConversation)
            .where(SharedConversation.conversation_id == conversation_id)
            .values(is_active=False)
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount > 0


sharing_service = SharingService()
