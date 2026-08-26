import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # App Metadata
    APP_NAME: str = "Bodh AI"
    VERSION: str = "2.5.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    BASE_URL: str = "http://localhost:3030"

    # Security
    SECRET_KEY: str = "bodhai_super_secure_secret_key_default_32_chars"
    CORS_ORIGINS: str = "http://localhost:3030,http://127.0.0.1:3030,http://localhost:8080,http://127.0.0.1:8080,*"

    # Database Settings
    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "bodhai_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Ollama Engine & Model Configuration
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen3:8b"
    OLLAMA_TIMEOUT: float = 300.0
    OLLAMA_NUM_PREDICT: int = 4096
    OLLAMA_TEMPERATURE: float = 0.7

    # Context & Memory Configuration
    MAX_CONTEXT_MESSAGES: int = 10
    MAX_PROMPT_CHARS: int = 10000
    AUTO_SUMMARIZE_THRESHOLD: int = 14

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def async_database_url(self) -> str:
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            url = self.DATABASE_URL.strip()
            # Normalize mysql:// to mysql+aiomysql:// for async SQLAlchemy
            if url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+aiomysql://", 1)
            elif url.startswith("sqlite:///") and not url.startswith("sqlite+aiosqlite:///"):
                url = url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
            return url

        # If DB_USER or DB_PASSWORD or DB_NAME is set specifically for MySQL
        if self.DB_NAME and (self.DB_PASSWORD or self.DB_USER != "root" or os.getenv("MYSQL_ENABLED") == "true"):
            pwd_part = f":{self.DB_PASSWORD}" if self.DB_PASSWORD else ""
            return f"mysql+aiomysql://{self.DB_USER}{pwd_part}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

        # Default local async SQLite storage if MySQL is not explicitly configured
        db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bodhai.db")
        return f"sqlite+aiosqlite:///{db_path}"


settings = Settings()
