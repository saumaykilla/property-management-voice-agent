import json
import logging
import re
from datetime import UTC, datetime

from app.clients.gemini import (
    GeminiRateLimitError,
    embed_text,
    enable_local_fallback,
    local_fallback_embedding,
    vector_to_sql,
)
from app.clients.storage import download_private_object
from app.db.pool import connection

logger = logging.getLogger(__name__)

MAX_CHUNK_CHARS = 900
CHUNK_OVERLAP_CHARS = 140


def _split_sentences(text: str) -> list[str]:
    candidates = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
    return [candidate.strip() for candidate in candidates if candidate.strip()]


def _build_chunks(text: str) -> list[str]:
    sentences = _split_sentences(text)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        next_value = f"{current} {sentence}".strip()

        if current and len(next_value) > MAX_CHUNK_CHARS:
            chunks.append(current.strip())
            overlap = current[-CHUNK_OVERLAP_CHARS:]
            current = f"{overlap} {sentence}".strip()
            continue

        current = next_value

    if current:
        chunks.append(current.strip())

    return chunks


def _extract_text_with_pypdf(pdf_bytes: bytes) -> str:
    from io import BytesIO

    from pypdf import PdfReader  # type: ignore[import-not-found]

    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n\n".join((page.extract_text() or "").strip() for page in reader.pages).strip()


def _extract_text_with_fallback(pdf_bytes: bytes) -> str:
    decoded = pdf_bytes.decode("latin-1", errors="ignore")
    text_matches = re.findall(r"\((.*?)\)\s*Tj", decoded)
    array_matches = re.findall(r"\[(.*?)\]\s*TJ", decoded, flags=re.DOTALL)

    extracted: list[str] = [match for match in text_matches if match.strip()]

    for match in array_matches:
        parts = re.findall(r"\((.*?)\)", match)
        if parts:
            extracted.append(" ".join(parts))

    if extracted:
        return "\n".join(extracted).strip()

    return re.sub(r"\s+", " ", decoded).strip()


def extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        text = _extract_text_with_pypdf(pdf_bytes)
        if text:
            return text
    except Exception:  # pragma: no cover - depends on optional dependency/runtime
        logger.info("Falling back to lightweight PDF parsing.")

    return _extract_text_with_fallback(pdf_bytes)


def _detect_category(text: str) -> str:
    normalized = text.lower()

    category_keywords = {
        "plumbing": ["leak", "water", "pipe", "sink", "toilet", "drain", "flood"],
        "electrical": ["electrical", "outlet", "breaker", "light", "spark", "power"],
        "hvac": ["heat", "heater", "ac", "air", "cooling", "thermostat"],
        "appliance": ["dishwasher", "fridge", "refrigerator", "oven", "stove", "washer", "dryer"],
        "pest": ["roach", "rat", "mouse", "bed bug", "pest"],
        "security": ["lock", "door", "window", "break in", "unsafe"],
    }

    for category, keywords in category_keywords.items():
        if any(keyword in normalized for keyword in keywords):
            return category

    return "general_maintenance"


def _detect_priority(text: str) -> str:
    normalized = text.lower()

    urgent_keywords = [
        "flood",
        "active leak",
        "gas",
        "smoke",
        "fire",
        "sparking",
        "no heat",
        "sewage",
    ]
    high_keywords = ["leak", "toilet", "lock", "hot water", "air conditioning", "power"]

    if any(keyword in normalized for keyword in urgent_keywords):
        return "urgent"

    if any(keyword in normalized for keyword in high_keywords):
        return "high"

    return "medium"


async def process_catalog_document(agency_id: str, document_id: str) -> dict:
    async with connection() as conn:
        document = await conn.fetchrow(
            """
            select id, agency_id, storage_bucket, storage_path, original_filename
            from public.service_catalog_documents
            where id = $1 and agency_id = $2
            """,
            document_id,
            agency_id,
        )

        if not document:
            raise ValueError("Catalog document not found for this agency.")

        await conn.execute(
            """
            update public.service_catalog_documents
            set ingestion_status = 'processing', ingestion_error = null
            where id = $1
            """,
            document_id,
        )

        try:
            pdf_bytes = await download_private_object(
                document["storage_bucket"],
                document["storage_path"],
            )
            extracted_text = extract_pdf_text(pdf_bytes)

            if not extracted_text.strip():
                raise ValueError("No readable text was extracted from the catalog PDF.")

            chunks = _build_chunks(extracted_text)

            if not chunks:
                raise ValueError("The catalog did not produce any searchable chunks.")

            try:
                embeddings = [await embed_text(chunk) for chunk in chunks]
            except GeminiRateLimitError:
                enable_local_fallback()
                logger.warning(
                    "Gemini rate limit hit during catalog ingestion; "
                    "using local fallback embeddings for agency=%s document=%s",
                    agency_id,
                    document_id,
                )
                embeddings = [local_fallback_embedding(chunk) for chunk in chunks]

            await conn.execute(
                "delete from public.service_catalog_chunks where document_id = $1",
                document_id,
            )

            await conn.executemany(
                """
                insert into public.service_catalog_chunks (
                  agency_id,
                  document_id,
                  chunk_index,
                  content,
                  embedding,
                  metadata_json
                )
                values ($1, $2, $3, $4, $5::vector, $6::jsonb)
                """,
                [
                    (
                        agency_id,
                        document_id,
                        index,
                        chunk,
                        vector_to_sql(embedding),
                        json.dumps(
                            {
                                "document_id": document_id,
                                "filename": document["original_filename"],
                                "chunk_index": index,
                            }
                        ),
                    )
                    for index, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True))
                ],
            )

            await conn.execute(
                """
                update public.service_catalog_documents
                set ingestion_status = 'ready',
                    ingestion_error = null,
                    ingested_at = $2
                where id = $1
                """,
                document_id,
                datetime.now(UTC),
            )

            logger.info(
                "Catalog ingestion complete for agency=%s document=%s chunks=%s",
                agency_id,
                document_id,
                len(chunks),
            )

            return {
                "document_id": document_id,
                "chunk_count": len(chunks),
                "status": "ready",
            }
        except Exception as exc:
            await conn.execute(
                """
                update public.service_catalog_documents
                set ingestion_status = 'failed',
                    ingestion_error = $2
                where id = $1
                """,
                document_id,
                str(exc),
            )

            await conn.execute(
                """
                update public.agencies
                set onboarding_status = case
                  when onboarding_status in ('catalog_processing', 'provisioning') then 'failed'
                  else onboarding_status
                end
                where id = $1
                """,
                agency_id,
            )

            logger.exception(
                "Catalog ingestion failed for agency=%s document=%s",
                agency_id,
                document_id,
            )
            raise


async def search_catalog(agency_id: str, issue_description: str, top_k: int = 5) -> dict:
    try:
        query_embedding = await embed_text(issue_description)
    except GeminiRateLimitError:
        enable_local_fallback()
        logger.warning(
            "Gemini rate limit hit during catalog search; using local fallback query embedding "
            "for agency=%s",
            agency_id,
        )
        query_embedding = local_fallback_embedding(issue_description)

    async with connection() as conn:
        rows = await conn.fetch(
            """
            select
              document_id,
              chunk_index,
              content,
              metadata_json,
              (1 - (embedding <=> $2::vector))::float as similarity
            from public.service_catalog_chunks
            where agency_id = $1
            order by embedding <=> $2::vector
            limit $3
            """,
            agency_id,
            vector_to_sql(query_embedding),
            max(1, min(top_k, 10)),
        )

    matched_chunks = [
        {
            "document_id": str(row["document_id"]),
            "chunk_index": row["chunk_index"],
            "content": row["content"],
            "metadata": row["metadata_json"],
            "similarity": round(float(row["similarity"]), 4),
        }
        for row in rows
    ]

    reference_text = " ".join(chunk["content"] for chunk in matched_chunks[:2])
    classification_text = f"{issue_description} {reference_text}".strip()
    top_similarity = matched_chunks[0]["similarity"] if matched_chunks else 0.0

    return {
        "matched_chunks": matched_chunks,
        "suggested_category": _detect_category(classification_text),
        "suggested_priority": _detect_priority(classification_text),
        "confidence": round(top_similarity, 4),
        "message_for_agent": (
            "Use the matched catalog guidance to answer carefully."
            if matched_chunks
            else "No matching catalog guidance was found for this issue."
        ),
    }
