import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import app.models  # noqa: F401  (register all models with Base.metadata)
from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.database import engine, Base
from app.core.rate_limit import get_redis
from app.services.cards.lookup import close_client

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# create_all only creates missing tables; columns added to existing tables
# need explicit ALTERs until Alembic migrations are wired up
_SCHEMA_PATCHES = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_level VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_tcg VARCHAR(50)",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in _SCHEMA_PATCHES:
            await conn.execute(text(stmt))
    yield
    await close_client()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Allow all localhost ports in development so hot-reload port changes don't break CORS
_cors_origins = settings.BACKEND_CORS_ORIGINS
_cors_regex = r"http://localhost:\d+" if settings.DEBUG else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Conversation-Id"],  # required for JS to read this header in CORS requests
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health_check():
    components = {}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        components["database"] = "ok"
    except Exception as exc:
        logger.error("Health check: database unavailable: %s", exc)
        components["database"] = "down"
    try:
        await get_redis().ping()
        components["redis"] = "ok"
    except Exception as exc:
        logger.error("Health check: redis unavailable: %s", exc)
        components["redis"] = "down"

    healthy = all(v == "ok" for v in components.values())
    return {
        "status": "ok" if healthy else "degraded",
        "version": settings.APP_VERSION,
        "components": components,
    }
