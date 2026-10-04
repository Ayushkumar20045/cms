from functools import lru_cache

import redis

from app.core.config import get_settings


@lru_cache
def get_redis() -> redis.Redis:
    return redis.Redis.from_url(get_settings().redis_url, decode_responses=True)


def too_many_attempts(key: str, limit: int, window_seconds: int) -> bool:
    """Fixed-window counter. Returns True once `key` has been hit more than `limit` times in the window."""
    r = get_redis()
    n = r.incr(key)
    if n == 1:
        r.expire(key, window_seconds)
    return n > limit


def reset(key: str) -> None:
    get_redis().delete(key)
