import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.conversation import (
    ConversationResponse,
    ConversationDetailResponse,
    ConversationUpdate,
    MessageResponse,
)
from app.schemas.share import ShareRequest, ShareResponse
from app.services.conversation_service import conversation_service
from app.services.sharing_service import sharing_service

logger = logging.getLogger("bodhai.routers.conversations")
router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=List[ConversationResponse])
async def list_conversations_endpoint(
    user_id: Optional[str] = Query(None, description="Optional filter by user ID"),
    include_archived: bool = Query(False, description="Include archived chats"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Filter by title"),
    db: AsyncSession = Depends(get_db)
):
    """
    List user conversations sorted by latest activity.
    """
    conversations = await conversation_service.list_conversations(
        db=db,
        user_id=user_id,
        include_archived=include_archived,
        limit=limit,
        offset=offset,
        search=search
    )
    return conversations


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_endpoint(
    conversation_id: str,
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve full conversation with its message history.
    """
    conv = await conversation_service.get_conversation(db, conversation_id, user_id=user_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    messages = await conversation_service.get_messages(db, conversation_id)

    return ConversationDetailResponse(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        model=conv.model,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        last_message_at=conv.last_message_at,
        messages=[MessageResponse.model_validate(m) for m in messages]
    )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation_endpoint(
    conversation_id: str,
    update_data: ConversationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Rename conversation or update archive status.
    """
    conv = await conversation_service.update_conversation(
        db=db,
        conversation_id=conversation_id,
        title=update_data.title,
        is_archived=update_data.is_archived
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv


@router.delete("/{conversation_id}")
async def delete_conversation_endpoint(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete conversation and all messages.
    """
    success = await conversation_service.delete_conversation(db, conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"deleted": True, "conversation_id": conversation_id}


@router.post("/{conversation_id}/archive", response_model=ConversationResponse)
async def archive_conversation_endpoint(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Archive a conversation.
    """
    conv = await conversation_service.update_conversation(
        db=db,
        conversation_id=conversation_id,
        is_archived=True
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return conv


@router.post("/{conversation_id}/share", response_model=ShareResponse)
async def share_conversation_endpoint(
    conversation_id: str,
    share_req: Optional[ShareRequest] = None,
    user_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate or retrieve a cryptographically secure public share link.
    """
    conv = await conversation_service.get_conversation(db, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    expires_days = share_req.expires_in_days if share_req else None
    share_info = await sharing_service.create_or_get_share_link(
        db=db,
        conversation_id=conversation_id,
        created_by=user_id,
        expires_in_days=expires_days
    )
    return ShareResponse(**share_info)


@router.delete("/{conversation_id}/share")
async def disable_share_endpoint(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Disable sharing for a conversation.
    """
    await sharing_service.disable_share_link(db, conversation_id)
    return {"disabled": True, "conversation_id": conversation_id}
