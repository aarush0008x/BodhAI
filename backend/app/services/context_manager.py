import logging
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.models.message import Message
from app.models.conversation_summary import ConversationSummary
from app.services.llm import BODH_SYSTEM_PROMPT, llm_service

logger = logging.getLogger("bodhai.context")


class ContextManager:
    def __init__(
        self,
        max_context_messages: int = settings.MAX_CONTEXT_MESSAGES,
        summarize_threshold: int = settings.AUTO_SUMMARIZE_THRESHOLD
    ):
        self.max_context_messages = max_context_messages
        self.summarize_threshold = summarize_threshold

    async def build_context_messages(
        self,
        db: AsyncSession,
        conversation_id: str,
        current_user_message: str,
        custom_system_prompt: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """
        Construct a token-efficient, memory-preserving message list for LLM inference.
        """
        # Fetch historical messages for the conversation in chronological order
        stmt = (
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.status.in_(["completed", "interrupted"])
            )
            .order_by(Message.created_at.asc())
        )
        result = await db.execute(stmt)
        all_history = list(result.scalars().all())

        system_content = (custom_system_prompt or BODH_SYSTEM_PROMPT).strip()
        formatted_messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_content}
        ]

        total_history_count = len(all_history)

        # Check if we should summarize older messages
        if total_history_count > self.summarize_threshold:
            # Check for existing summary
            summary_stmt = select(ConversationSummary).where(
                ConversationSummary.conversation_id == conversation_id
            )
            summary_res = await db.execute(summary_stmt)
            existing_summary = summary_res.scalar_one_or_none()

            # The older slice to summarize
            older_slice = all_history[:-self.max_context_messages]
            recent_slice = all_history[-self.max_context_messages:]

            summary_text = ""
            if existing_summary and existing_summary.summary:
                summary_text = existing_summary.summary
            else:
                # Format older messages for summarization
                older_text = "\n".join(
                    [f"{m.role.capitalize()}: {m.content}" for m in older_slice]
                )
                try:
                    summary_text = await llm_service.summarize_history(older_text)
                    if summary_text:
                        new_summary = ConversationSummary(
                            conversation_id=conversation_id,
                            summary=summary_text
                        )
                        db.add(new_summary)
                        await db.flush()
                except Exception as e:
                    logger.warning(f"Error creating summary: {e}")

            if summary_text:
                formatted_messages.append({
                    "role": "system",
                    "content": f"Context summary of earlier conversation:\n{summary_text}"
                })

            # Add recent messages verbatim
            for msg in recent_slice:
                formatted_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

        else:
            # Under threshold: include recent messages directly up to max_context_messages
            recent = all_history[-self.max_context_messages:] if total_history_count > self.max_context_messages else all_history
            for msg in recent:
                formatted_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

        # Append current user prompt
        formatted_messages.append({
            "role": "user",
            "content": current_user_message
        })

        return formatted_messages


context_manager = ContextManager()
