import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.share import SharedConversationView
from app.services.sharing_service import sharing_service

logger = logging.getLogger("bodhai.routers.share")
router = APIRouter(tags=["Sharing"])


@router.get("/share/{share_token}", response_model=SharedConversationView)
async def get_public_shared_conversation(
    share_token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Public read-only endpoint for viewing shared conversations.
    Does not require authentication and returns only public-safe fields.
    """
    shared_data = await sharing_service.get_shared_conversation(db, share_token)
    if not shared_data:
        raise HTTPException(
            status_code=404,
            detail="Shared conversation not found, expired, or sharing has been disabled."
        )

    return SharedConversationView(**shared_data)
