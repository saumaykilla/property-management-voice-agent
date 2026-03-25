from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg

from app.core.config import get_settings

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global _pool

    if _pool is None:
        settings = get_settings()
        _pool = await asyncpg.create_pool(str(settings.supabase_direct_postgres_url))

    return _pool


@asynccontextmanager
async def connection() -> AsyncIterator[asyncpg.Connection]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn

