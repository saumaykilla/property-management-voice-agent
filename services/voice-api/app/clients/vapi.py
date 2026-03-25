import asyncio
import json
from urllib import error, request

from app.core.config import get_settings


class VapiRequestError(RuntimeError):
    def __init__(
        self,
        path: str,
        *,
        status_code: int | None = None,
        detail: str | None = None,
    ) -> None:
        self.path = path
        self.status_code = status_code
        self.detail = detail

        message = f"Vapi request failed for {path}"
        if status_code is not None:
            message += f" with HTTP {status_code}"
        if detail:
            message += f": {detail}"

        super().__init__(message)


def _extract_error_detail(raw_body: str) -> str | None:
    cleaned_body = raw_body.strip()

    if not cleaned_body:
        return None

    try:
        payload = json.loads(cleaned_body)
    except json.JSONDecodeError:
        return cleaned_body

    if isinstance(payload, dict):
        return (
            payload.get("message")
            or payload.get("error")
            or payload.get("detail")
            or cleaned_body
        )

    return cleaned_body


def _request(method: str, path: str, payload: dict | None = None) -> dict:
    settings = get_settings()

    if not settings.vapi_api_key:
        raise VapiRequestError(path, detail="Missing VAPI_API_KEY.")

    req = request.Request(
        f"https://api.vapi.ai{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers={
            "Authorization": f"Bearer {settings.vapi_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "property-management/0.1",
        },
        method=method,
    )

    try:
        with request.urlopen(req, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:  # pragma: no cover - network/runtime dependent
        raw_body = exc.read().decode("utf-8", errors="ignore")
        raise VapiRequestError(
            path,
            status_code=exc.code,
            detail=_extract_error_detail(raw_body),
        ) from exc
    except error.URLError as exc:  # pragma: no cover - network/runtime dependent
        raise VapiRequestError(path, detail=str(exc.reason)) from exc


async def create_assistant(payload: dict) -> dict:
    return await asyncio.to_thread(_request, "POST", "/assistant", payload)


async def create_phone_number(payload: dict) -> dict:
    return await asyncio.to_thread(_request, "POST", "/phone-number", payload)


async def get_phone_number(phone_number_id: str) -> dict:
    return await asyncio.to_thread(_request, "GET", f"/phone-number/{phone_number_id}", None)
