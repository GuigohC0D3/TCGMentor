import json
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    APP_NAME: str = "TCGMentor"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # API
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list) -> list[str]:
        if isinstance(v, list):
            return v
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass
        return [s.strip() for s in v.split(",") if s.strip()]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tcgmentor"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_set(cls, v: str) -> str:
        if v == "change-me-in-production-use-openssl-rand-hex-32":
            import warnings
            warnings.warn(
                "SECRET_KEY is using the default insecure value. "
                "Generate one with: openssl rand -hex 32",
                stacklevel=2,
            )
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    # HuggingFace Inference API (OpenAI-compatible)
    HF_TOKEN: str
    HF_BASE_URL: str = "https://api-inference.huggingface.co/v1"
    HF_MODEL: str = "Qwen/Qwen2.5-72B-Instruct"
    HF_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ChromaDB (future RAG)
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000
    CHROMA_COLLECTION_TCG: str = "tcg_knowledge"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
