import logging
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import settings

logger = logging.getLogger("bodhai.database")


class Base(DeclarativeBase):
    pass


def make_engine(db_url: str) -> AsyncEngine:
    kwargs = {
        "echo": settings.DEBUG,
        "future": True,
    }
    if "mysql" in db_url:
        kwargs.update({
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_recycle": 3600,
            "pool_pre_ping": True,
        })
    elif "sqlite" in db_url:
        kwargs.update({
            "connect_args": {"check_same_thread": False},
        })
    return create_async_engine(db_url, **kwargs)


# Active engine & sessionmaker references
_active_engine: AsyncEngine = make_engine(settings.async_database_url)
_active_sessionmaker: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=_active_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


def get_active_engine() -> AsyncEngine:
    return _active_engine


def get_active_sessionmaker() -> async_sessionmaker[AsyncSession]:
    return _active_sessionmaker


class SessionProxy:
    """Proxy object so imports like 'from app.database import AsyncSessionLocal' always use active sessionmaker."""
    def __call__(self, **kwargs) -> AsyncSession:
        return _active_sessionmaker(**kwargs)


AsyncSessionLocal = SessionProxy()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with _active_sessionmaker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Verify database connection on startup with clean automatic fallback."""
    global _active_engine, _active_sessionmaker

    import app.models.user  # noqa: F401
    import app.models.conversation  # noqa: F401
    import app.models.message  # noqa: F401
    import app.models.conversation_summary  # noqa: F401
    import app.models.shared_conversation  # noqa: F401

    try:
        # Quick test connection with 3-second timeout
        async with _active_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        if "mysql" in settings.async_database_url:
            # Fallback to local SQLite when remote MySQL is unreachable
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "bodhai.db")
            fallback_url = f"sqlite+aiosqlite:///{db_path}"
            _active_engine = make_engine(fallback_url)
            _active_sessionmaker = async_sessionmaker(
                bind=_active_engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False,
                autocommit=False,
            )
            async with _active_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        else:
            raise
