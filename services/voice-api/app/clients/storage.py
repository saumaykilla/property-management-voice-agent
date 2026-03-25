import asyncio
from urllib import parse, request

from app.core.config import get_settings


def _build_storage_download_url(bucket: str, path: str) -> str:
    settings = get_settings()
    quoted_path = parse.quote(path, safe="/")
    return f"{settings.supabase_url}/storage/v1/object/authenticated/{bucket}/{quoted_path}"


def _download(bucket: str, path: str) -> bytes:
    settings = get_settings()
    req = request.Request(
        _build_storage_download_url(bucket, path),
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
        },
        method="GET",
    )

    with request.urlopen(req, timeout=45) as response:
        return response.read()


async def download_private_object(bucket: str, path: str) -> bytes:
    return await asyncio.to_thread(_download, bucket, path)
