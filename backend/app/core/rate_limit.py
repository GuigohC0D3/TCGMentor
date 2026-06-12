import logging

import redis.asyncio as aioredis
from fastapi import HTTPException, Request, status

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis() -> aioredis.Redis:
    return _redis


async def check_rate(key: str, times: int, seconds: int) -> None:
    try:
        async with _redis.pipeline(transaction=True) as pipe:
            count, _ = await pipe.incr(key).expire(key, seconds).execute()
    except Exception as exc:
        # Fail open: availability over strictness if Redis is down
        logger.warning("Rate limiter unavailable, allowing request: %s", exc)
        return

    if count > times:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests, please try again later",
        )


async def check_daily_quota(
    key: str,
    limit: int,
    detail: str = "Daily free message limit reached. Upgrade to premium for unlimited messages.",
) -> None:
    """Daily quota for free users (premium users skip this entirely)."""
    try:
        async with _redis.pipeline(transaction=True) as pipe:
            count, _ = await pipe.incr(key).expire(key, 86400, nx=True).execute()
    except Exception as exc:
        logger.warning("Quota check unavailable, allowing request: %s", exc)
        return

    if count > limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)


def rate_limit_ip(scope: str, times: int, seconds: int = 60):
    """Per-IP limiter for unauthenticated endpoints (login, register)."""

    async def dependency(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        await check_rate(f"rl:{scope}:{ip}", times, seconds)

    return dependency
