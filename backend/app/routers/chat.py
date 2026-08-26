import json
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.config import settings
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    StopRequest,
    ContinueRequest,
    RegenerateRequest,
)
from app.services.llm import llm_service, clean_response, OllamaException
from app.services.context_manager import context_manager
from app.services.conversation_service import (
    conversation_service,
    deduplicate_continuation,
)

logger = logging.getLogger("bodhai.routers.chat")
router = APIRouter(tags=["Chat"])


def format_sse(data: dict) -> str:
    """Format dictionary as Server-Sent Event data line."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def stream_chat_endpoint(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Primary streaming chat endpoint emitting SSE events:
    message_start -> message_delta* -> message_complete | error
    """
    prompt = request.message.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if len(prompt) > settings.MAX_PROMPT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Message exceeds maximum character limit of {settings.MAX_PROMPT_CHARS}."
        )

    # 1. Get or create conversation
    conv, is_new = await conversation_service.get_or_create_conversation(
        db=db,
        conversation_id=request.conversation_id,
        user_id=request.user_id,
        initial_prompt=prompt,
        model=request.model or settings.OLLAMA_MODEL
    )

    # 2. Save user message
    user_msg = await conversation_service.save_user_message(
        db=db,
        conversation_id=conv.id,
        content=prompt
    )

    # 3. Create placeholder assistant message
    assistant_msg = await conversation_service.create_assistant_placeholder(
        db=db,
        conversation_id=conv.id
    )

    # 4. Build memory-managed context messages
    context_msgs = await context_manager.build_context_messages(
        db=db,
        conversation_id=conv.id,
        current_user_message=prompt,
        custom_system_prompt=request.system_prompt
    )

    # 5. Generator for streaming SSE response
    async def sse_event_stream() -> AsyncGenerator[str, None]:
        full_content = ""
        total_tokens = 0
        finish_reason = "stop"

        # Emit start event
        yield format_sse({
            "type": "message_start",
            "conversation_id": conv.id,
            "conversation_title": conv.title,
            "message_id": assistant_msg.id,
            "user_message_id": user_msg.id,
            "model": request.model or settings.OLLAMA_MODEL,
            "is_new": is_new
        })

        try:
            generator = llm_service.stream_chat(
                messages=context_msgs,
                options={"temperature": request.temperature} if request.temperature is not None else None,
                model=request.model or settings.OLLAMA_MODEL
            )

            async for chunk_data in generator:
                chunk_text = chunk_data.get("content", "")
                if chunk_text:
                    full_content += chunk_text
                    yield format_sse({
                        "type": "message_delta",
                        "content": chunk_text
                    })

                if chunk_data.get("done"):
                    finish_reason = chunk_data.get("done_reason", "stop")
                    total_tokens = chunk_data.get("eval_count", 0)

            # Clean and finalize message in DB
            cleaned_final = clean_response(full_content)
            await conversation_service.update_assistant_message(
                db=db,
                message_id=assistant_msg.id,
                content=cleaned_final,
                status="completed",
                tokens_used=total_tokens or max(1, len(cleaned_final) // 4)
            )

            yield format_sse({
                "type": "message_complete",
                "conversation_id": conv.id,
                "message_id": assistant_msg.id,
                "finish_reason": finish_reason,
                "tokens_used": total_tokens or max(1, len(cleaned_final) // 4)
            })

        except OllamaException as e:
            logger.error(f"Ollama stream error: {e.message}")
            await conversation_service.mark_message_failed(
                db=db,
                message_id=assistant_msg.id,
                error_text=e.message
            )
            yield format_sse({
                "type": "error",
                "code": e.code,
                "message": e.message
            })
        except Exception as e:
            logger.error(f"Unexpected streaming failure: {e}", exc_info=True)
            await conversation_service.mark_message_failed(
                db=db,
                message_id=assistant_msg.id,
                error_text=str(e)
            )
            yield format_sse({
                "type": "error",
                "code": "INTERNAL_STREAM_ERROR",
                "message": "An error occurred during response generation. Please try again."
            })

    return StreamingResponse(
        sse_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/chat", response_model=ChatResponse)
async def synchronous_chat_endpoint(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Backward-compatible synchronous chat endpoint.
    """
    prompt = request.message.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    conv, _ = await conversation_service.get_or_create_conversation(
        db=db,
        conversation_id=request.conversation_id,
        user_id=request.user_id,
        initial_prompt=prompt,
        model=request.model or settings.OLLAMA_MODEL
    )

    await conversation_service.save_user_message(
        db=db,
        conversation_id=conv.id,
        content=prompt
    )

    assistant_msg = await conversation_service.create_assistant_placeholder(
        db=db,
        conversation_id=conv.id
    )

    context_msgs = await context_manager.build_context_messages(
        db=db,
        conversation_id=conv.id,
        current_user_message=prompt,
        custom_system_prompt=request.system_prompt
    )

    try:
        gen_result = await llm_service.generate_chat(
            messages=context_msgs,
            options={"temperature": request.temperature} if request.temperature is not None else None,
            model=request.model or settings.OLLAMA_MODEL
        )
        content = gen_result["content"]
        tokens = gen_result["tokens_used"]

        await conversation_service.update_assistant_message(
            db=db,
            message_id=assistant_msg.id,
            content=content,
            status="completed",
            tokens_used=tokens
        )

        return ChatResponse(
            conversation_id=conv.id,
            message_id=assistant_msg.id,
            model=request.model or settings.OLLAMA_MODEL,
            response=content,
            status="completed"
        )
    except OllamaException as e:
        await conversation_service.mark_message_failed(db=db, message_id=assistant_msg.id, error_text=e.message)
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        await conversation_service.mark_message_failed(db=db, message_id=assistant_msg.id, error_text=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate AI response.")


@router.post("/chat/stop/{message_id}")
async def stop_generation_endpoint(
    message_id: str,
    stop_req: Optional[StopRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel an ongoing generation and preserve partial content.
    """
    msg = await conversation_service.get_messages(db, "")
    # Find message by id
    from sqlalchemy import select
    from app.models.message import Message
    stmt = select(Message).where(Message.id == message_id)
    res = await db.execute(stmt)
    target = res.scalar_one_or_none()

    if not target:
        raise HTTPException(status_code=404, detail="Message not found.")

    updated = await conversation_service.mark_message_interrupted(
        db=db,
        message_id=message_id,
        partial_content=target.content
    )
    return {"status": "stopped", "message_id": message_id, "saved_content": updated.content if updated else ""}


@router.post("/chat/continue/{message_id}")
async def continue_generation_endpoint(
    message_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Continue generating from where the assistant response stopped.
    """
    from sqlalchemy import select
    from app.models.message import Message
    stmt = select(Message).where(Message.id == message_id)
    res = await db.execute(stmt)
    target = res.scalar_one_or_none()

    if not target or target.role != "assistant":
        raise HTTPException(status_code=404, detail="Assistant message not found.")

    conv_id = target.conversation_id
    existing_content = target.content

    # Build context asking model to continue seamlessly
    history_stmt = (
        select(Message)
        .where(
            Message.conversation_id == conv_id,
            Message.id != message_id,
            Message.status.in_(["completed", "interrupted"])
        )
        .order_by(Message.created_at.asc())
    )
    hist_res = await db.execute(history_stmt)
    history = list(hist_res.scalars().all())

    messages_payload = [{"role": "system", "content": settings.OLLAMA_MODEL}]
    for m in history:
        messages_payload.append({"role": m.role, "content": m.content})

    # Add partial assistant response + continuation prompt
    continuation_instruction = (
        f"Continue the previous response directly from where it was cut off. "
        f"Do not repeat the previous sentences.\n\n"
        f"Previous partial text was:\n{existing_content[-500:] if len(existing_content) > 500 else existing_content}"
    )
    messages_payload.append({"role": "user", "content": continuation_instruction})

    async def continue_sse_stream() -> AsyncGenerator[str, None]:
        accumulated_new = ""
        total_tokens = 0

        yield format_sse({
            "type": "message_start",
            "conversation_id": conv_id,
            "message_id": message_id,
            "continuation": True
        })

        try:
            generator = llm_service.stream_chat(messages=messages_payload)
            async for chunk in generator:
                chunk_text = chunk.get("content", "")
                if chunk_text:
                    accumulated_new += chunk_text
                    yield format_sse({
                        "type": "message_delta",
                        "content": chunk_text
                    })
                if chunk.get("done"):
                    total_tokens = chunk.get("eval_count", 0)

            # Intelligently merge existing and new content without duplication
            merged = deduplicate_continuation(existing_content, accumulated_new)
            cleaned = clean_response(merged)

            await conversation_service.update_assistant_message(
                db=db,
                message_id=message_id,
                content=cleaned,
                status="completed",
                tokens_used=target.tokens_used + total_tokens
            )

            yield format_sse({
                "type": "message_complete",
                "conversation_id": conv_id,
                "message_id": message_id,
                "finish_reason": "stop"
            })

        except Exception as e:
            logger.error(f"Error in continue generation: {e}")
            yield format_sse({
                "type": "error",
                "code": "CONTINUE_FAILED",
                "message": "Failed to continue response generation."
            })

    return StreamingResponse(
        continue_sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive"
        }
    )


@router.post("/chat/regenerate")
async def regenerate_endpoint(
    req: RegenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerate the response for the specified assistant message.
    """
    from sqlalchemy import select
    from app.models.message import Message

    # Fetch target message
    stmt = select(Message).where(Message.id == req.message_id)
    res = await db.execute(stmt)
    target = res.scalar_one_or_none()

    if not target or target.role != "assistant":
        raise HTTPException(status_code=404, detail="Assistant message to regenerate was not found.")

    # Find the preceding user message
    user_stmt = (
        select(Message)
        .where(
            Message.conversation_id == req.conversation_id,
            Message.created_at < target.created_at,
            Message.role == "user"
        )
        .order_by(Message.created_at.desc())
    )
    user_res = await db.execute(user_stmt)
    last_user_msg = user_res.scalar_one_or_none()

    if not last_user_msg:
        raise HTTPException(status_code=400, detail="Cannot find user prompt to regenerate response for.")

    # Stream regeneration using the user prompt
    return await stream_chat_endpoint(
        ChatRequest(
            conversation_id=req.conversation_id,
            message=last_user_msg.content
        ),
        db=db
    )
