import pytest
import pytest_asyncio
import uuid
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from main import app
from app.database import Base, get_db
from app.services.llm import clean_response, llm_service, OllamaException
from app.services.conversation_service import (
    generate_title_from_prompt,
    deduplicate_continuation,
    conversation_service,
)
from app.services.sharing_service import sharing_service
from app.services.context_manager import context_manager

# Use in-memory SQLite database for fast automated testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db():
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.mark.asyncio
async def test_clean_response():
    # Test think tag removal
    raw = "<think>internal reasoning steps</think>Here is the actual answer."
    assert clean_response(raw) == "Here is the actual answer."

    # Test multiline think removal
    raw_multi = "<think>\nStep 1: calculate\nStep 2: verify\n</think>\n\nFinal result is 42."
    assert clean_response(raw_multi) == "Final result is 42."

    # Test unclosed think removal
    raw_unclosed = "<think>still thinking"
    assert clean_response(raw_unclosed) == ""


@pytest.mark.asyncio
async def test_title_generation():
    prompt = "How does quantum key distribution protect communications?"
    title = generate_title_from_prompt(prompt)
    assert "quantum" in title.lower()
    assert len(title) > 5


@pytest.mark.asyncio
async def test_deduplicate_continuation():
    existing = "This is the beginning of the explanation."
    continuation = "This is the beginning of the explanation. And here is the rest."
    merged = deduplicate_continuation(existing, continuation)
    assert merged.count("This is the beginning of the explanation.") == 1

    existing_clean = "Part 1 of the answer."
    continuation_clean = "Part 2 of the answer."
    merged_clean = deduplicate_continuation(existing_clean, continuation_clean)
    assert "Part 1" in merged_clean and "Part 2" in merged_clean


@pytest.mark.asyncio
async def test_conversation_service_crud():
    async with TestSessionLocal() as db:
        # Create conversation
        conv, is_new = await conversation_service.get_or_create_conversation(
            db=db,
            initial_prompt="What is async Python?",
            model="qwen3:8b"
        )
        assert is_new is True
        assert conv.id is not None
        assert "what is async" in conv.title.lower()

        # Save user message
        user_msg = await conversation_service.save_user_message(
            db=db,
            conversation_id=conv.id,
            content="What is async Python?"
        )
        assert user_msg.role == "user"
        assert user_msg.content == "What is async Python?"

        # Create assistant placeholder
        asst_msg = await conversation_service.create_assistant_placeholder(
            db=db,
            conversation_id=conv.id
        )
        assert asst_msg.role == "assistant"
        assert asst_msg.status == "streaming"

        # Update assistant message
        updated_asst = await conversation_service.update_assistant_message(
            db=db,
            message_id=asst_msg.id,
            content="Async Python uses asyncio for concurrent I/O.",
            status="completed",
            tokens_used=12
        )
        assert updated_asst.status == "completed"
        assert "Async Python" in updated_asst.content

        # List conversations
        convs = await conversation_service.list_conversations(db=db)
        assert len(convs) == 1
        assert convs[0].id == conv.id

        # Update title
        renamed = await conversation_service.update_conversation(
            db=db,
            conversation_id=conv.id,
            title="Renamed Python Chat"
        )
        assert renamed.title == "Renamed Python Chat"

        # Delete conversation
        deleted = await conversation_service.delete_conversation(db=db, conversation_id=conv.id)
        assert deleted is True

        # Verify deletion
        convs_after = await conversation_service.list_conversations(db=db)
        assert len(convs_after) == 0


@pytest.mark.asyncio
async def test_sharing_service():
    async with TestSessionLocal() as db:
        # Create conversation
        conv, _ = await conversation_service.get_or_create_conversation(
            db=db,
            initial_prompt="Shareable chat topic"
        )
        # Add messages
        await conversation_service.save_user_message(db, conv.id, "Explain recursion")
        asst = await conversation_service.create_assistant_placeholder(db, conv.id)
        await conversation_service.update_assistant_message(
            db, asst.id, "Recursion is when a function calls itself.", "completed"
        )

        # Create share link
        share_info = await sharing_service.create_or_get_share_link(
            db=db,
            conversation_id=conv.id,
            expires_in_days=7
        )
        assert "share_url" in share_info
        assert "share_token" in share_info
        token = share_info["share_token"]

        # Retrieve shared conversation
        shared_view = await sharing_service.get_shared_conversation(db, token)
        assert shared_view is not None
        assert shared_view["title"] == conv.title
        assert len(shared_view["messages"]) == 2
        assert shared_view["messages"][0]["role"] == "user"
        assert shared_view["messages"][1]["role"] == "assistant"
        assert shared_view["messages"][1]["content"] == "Recursion is when a function calls itself."

        # Disable share link
        await sharing_service.disable_share_link(db, conv.id)

        # Verify inactive
        shared_view_disabled = await sharing_service.get_shared_conversation(db, token)
        assert shared_view_disabled is None


@pytest.mark.asyncio
async def test_streaming_chat_endpoint_mocked():
    async def mock_stream_chat(*args, **kwargs):
        yield {"content": "Hello, ", "done": False, "eval_count": 2}
        yield {"content": "I am Bodh AI!", "done": True, "eval_count": 6, "done_reason": "stop"}

    with patch.object(llm_service, "stream_chat", side_effect=mock_stream_chat):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post(
                "/chat/stream",
                json={"message": "Hello!"}
            )
            assert res.status_code == 200
            assert "text/event-stream" in res.headers["content-type"]
            body = res.text
            assert "message_start" in body
            assert "message_delta" in body
            assert "message_complete" in body
            assert "Hello, " in body
            assert "I am Bodh AI!" in body


@pytest.mark.asyncio
async def test_conversation_api_full_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create conversation by posting message
        async def mock_stream_chat(*args, **kwargs):
            yield {"content": "Test response", "done": True, "eval_count": 5}

        with patch.object(llm_service, "stream_chat", side_effect=mock_stream_chat):
            stream_res = await ac.post("/chat/stream", json={"message": "First message"})
            assert stream_res.status_code == 200

        # List conversations
        list_res = await ac.get("/conversations")
        assert list_res.status_code == 200
        convs = list_res.json()
        assert len(convs) >= 1
        conv_id = convs[0]["id"]

        # Get conversation detail
        detail_res = await ac.get(f"/conversations/{conv_id}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["id"] == conv_id
        assert len(detail["messages"]) == 2  # user + assistant

        # Rename conversation
        patch_res = await ac.patch(f"/conversations/{conv_id}", json={"title": "Updated Title"})
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Updated Title"

        # Archive conversation
        archive_res = await ac.post(f"/conversations/{conv_id}/archive")
        assert archive_res.status_code == 200
        assert archive_res.json()["is_archived"] is True

        # Share conversation
        share_res = await ac.post(f"/conversations/{conv_id}/share", json={"expires_in_days": 30})
        assert share_res.status_code == 200
        share_token = share_res.json()["share_token"]

        # Public share endpoint
        public_res = await ac.get(f"/share/{share_token}")
        assert public_res.status_code == 200
        assert public_res.json()["title"] == "Updated Title"

        # Disable share
        disable_res = await ac.delete(f"/conversations/{conv_id}/share")
        assert disable_res.status_code == 200

        # Public share endpoint after disable (should be 404)
        disabled_check = await ac.get(f"/share/{share_token}")
        assert disabled_check.status_code == 404

        # Delete conversation
        del_res = await ac.delete(f"/conversations/{conv_id}")
        assert del_res.status_code == 200


@pytest.mark.asyncio
async def test_ollama_error_handling():
    async def mock_stream_chat_error(*args, **kwargs):
        raise OllamaException("OLLAMA_UNAVAILABLE", "Ollama is down", status_code=503)
        yield  # Make it an async generator

    with patch.object(llm_service, "stream_chat", side_effect=mock_stream_chat_error):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post("/chat/stream", json={"message": "Test error handling"})
            assert res.status_code == 200
            assert 'data: {"type": "error", "code": "OLLAMA_UNAVAILABLE"' in res.text
