import asyncio
import hashlib
import json
import math
import re
import time
from collections import defaultdict
from urllib import error, request

from app.core.config import get_settings

EMBEDDING_DIMENSION = 768
MAX_EMBED_RETRIES = 3
INITIAL_RETRY_DELAY_SECONDS = 1.0
_force_local_fallback = False


class GeminiRateLimitError(RuntimeError):
    pass


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _hash_embedding(text: str, dimension: int = EMBEDDING_DIMENSION) -> list[float]:
    buckets: dict[int, float] = defaultdict(float)
    tokens = re.findall(r"[a-z0-9]+", text.lower())

    if not tokens:
        return [0.0] * dimension

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:2], "big") % dimension
        sign = 1.0 if digest[2] % 2 == 0 else -1.0
        buckets[index] += sign

    values = [buckets[index] for index in range(dimension)]
    magnitude = math.sqrt(sum(value * value for value in values))

    if magnitude == 0:
        return [0.0] * dimension

    return [round(value / magnitude, 8) for value in values]


def local_fallback_embedding(text: str) -> list[float]:
    return _hash_embedding(_normalize_text(text))


def enable_local_fallback() -> None:
    global _force_local_fallback
    _force_local_fallback = True


def _should_use_local_fallback() -> bool:
    settings = get_settings()
    api_key = settings.gemini_api_key
    return _force_local_fallback or not api_key or api_key.startswith("local_")


def _read_http_error_body(exc: error.HTTPError) -> str:
    try:
        return exc.read().decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


def _embed_via_rest(text: str) -> list[float]:
    settings = get_settings()

    if not settings.gemini_api_key:
        raise RuntimeError("Missing GEMINI_API_KEY.")

    payload = json.dumps(
        {
            "content": {"parts": [{"text": _normalize_text(text)}]},
            "output_dimensionality": EMBEDDING_DIMENSION,
        }
    ).encode("utf-8")

    req = request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key,
        },
        method="POST",
    )

    for attempt in range(MAX_EMBED_RETRIES):
        try:
            with request.urlopen(req, timeout=45) as response:
                body = json.loads(response.read().decode("utf-8"))
            break
        except error.HTTPError as exc:
            details = _read_http_error_body(exc)
            is_retryable = exc.code == 429 or 500 <= exc.code < 600

            if is_retryable and attempt < MAX_EMBED_RETRIES - 1:
                time.sleep(INITIAL_RETRY_DELAY_SECONDS * (2**attempt))
                continue

            if exc.code == 429:
                message = "Gemini embedding requests were rate limited."
                if details:
                    message = f"{message} {details}"
                raise GeminiRateLimitError(message) from exc

            if details:
                raise RuntimeError(
                    f"Gemini embedding request failed with HTTP {exc.code}: {details}"
                ) from exc

            raise RuntimeError(
                f"Gemini embedding request failed with HTTP {exc.code}."
            ) from exc
        except error.URLError as exc:
            if attempt < MAX_EMBED_RETRIES - 1:
                time.sleep(INITIAL_RETRY_DELAY_SECONDS * (2**attempt))
                continue
            raise RuntimeError(f"Gemini embedding request failed: {exc.reason}") from exc

    embedding = body.get("embedding", {}).get("values")

    if not embedding:
        embeddings = body.get("embeddings") or []
        if embeddings:
            embedding = embeddings[0].get("values")

    if not embedding or len(embedding) != EMBEDDING_DIMENSION:
        raise RuntimeError("Gemini returned an invalid embedding payload.")

    return [float(value) for value in embedding]


async def embed_text(text: str) -> list[float]:
    cleaned_text = _normalize_text(text)

    if not cleaned_text:
        return [0.0] * EMBEDDING_DIMENSION

    if _should_use_local_fallback():
        return local_fallback_embedding(cleaned_text)

    return await asyncio.to_thread(_embed_via_rest, cleaned_text)


def vector_to_sql(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"
