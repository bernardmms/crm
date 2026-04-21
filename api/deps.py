from __future__ import annotations

from typing import AsyncGenerator

from supabase import AsyncClient, acreate_client

from api.config import settings

_client: AsyncClient | None = None


async def get_client() -> AsyncClient:
    global _client
    if _client is None:
        _client = await acreate_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


async def get_db() -> AsyncGenerator[AsyncClient, None]:
    yield await get_client()
