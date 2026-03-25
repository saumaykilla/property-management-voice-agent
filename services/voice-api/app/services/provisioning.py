import hashlib
import logging
from typing import Any
from urllib.parse import urlparse

from app.clients.vapi import (
    VapiRequestError,
    create_assistant,
    create_phone_number,
    get_phone_number,
)
from app.core.config import get_settings
from app.db.pool import connection

logger = logging.getLogger(__name__)


class ManualPhoneSetupRequiredError(RuntimeError):
    pass


def _hours_summary(rows: list[dict[str, Any]]) -> list[str]:
    weekday_labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    summary: list[str] = []

    for row in rows:
        weekday = weekday_labels[int(row["weekday"])]

        if row["is_closed"]:
            summary.append(f"{weekday}: closed")
            continue

        summary.append(
            f"{weekday}: {row['start_time_local']} to {row['end_time_local']} local time"
        )

    return summary


def _build_tool_schema(required_fields: list[str], properties: dict[str, dict]) -> dict:
    return {
        "type": "object",
        "required": required_fields,
        "properties": properties,
    }


def _build_tool_parameters(agency_id: str) -> list[dict[str, str]]:
    return [{"key": "agency_id", "value": agency_id}]


def _get_public_tool_base_url() -> str:
    settings = get_settings()
    base_url = (settings.public_base_url or "").rstrip("/")

    if not base_url:
        raise ValueError(
            "Missing VAPI_PUBLIC_BASE_URL. Vapi tools run from the cloud, so services/voice-api "
            "must be exposed on a public URL. On Vercel, enable system environment variables or "
            "set VAPI_PUBLIC_BASE_URL explicitly."
        )

    hostname = (urlparse(base_url).hostname or "").lower()
    if hostname in {"127.0.0.1", "0.0.0.0", "::1", "localhost"}:
        raise ValueError(
            "VAPI_PUBLIC_BASE_URL cannot point to localhost. Vapi tools run from the cloud, so "
            "expose services/voice-api with a public HTTPS URL (for example ngrok or "
            "cloudflared) and set VAPI_PUBLIC_BASE_URL to that origin."
        )

    return base_url


def _build_assistant_payload(agency: dict[str, Any], hours_summary: list[str]) -> dict:
    base_url = _get_public_tool_base_url()
    agency_id = str(agency["id"])

    system_prompt = (
        f"You are the voice assistant for {agency['name']}. "
        "Introduce yourself as the property management office. "
        "Collect caller name, callback phone, property address, unit number, and issue details. "
        "Validate the unit before searching the catalog or creating a ticket. "
        "Do not invent policies, promises, or emergency guarantees. "
        "Create tickets when the issue is actionable. "
        "Only transfer when the caller asks for a human or "
        "when the assistant cannot finish the workflow. "
        f"Business hours: {'; '.join(hours_summary)}."
    )

    return {
        "name": f"{agency['name'][:40]} Desk",
        "firstMessage": (
            f"Thanks for calling {agency['name']}. "
            "How can I help with your maintenance issue today?"
        ),
        "firstMessageMode": "assistant-speaks-first",
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "en",
        },
        "voice": {
            "provider": "vapi",
            "voiceId": "Elliot",
        },
        "model": {
            "provider": "openai",
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                }
            ],
            "tools": [
                {
                    "type": "apiRequest",
                    "name": "validate_managed_unit",
                    "description": (
                        "Confirm that the caller's property address "
                        "and unit are managed by this agency."
                    ),
                    "method": "POST",
                    "url": f"{base_url}/tools/validate-managed-unit",
                    "parameters": _build_tool_parameters(agency_id),
                    "body": _build_tool_schema(
                        ["property_address", "unit_number"],
                        {
                            "agency_id": {"type": "string"},
                            "property_address": {"type": "string"},
                            "unit_number": {"type": "string"},
                        },
                    ),
                },
                {
                    "type": "apiRequest",
                    "name": "search_service_catalog",
                    "description": (
                        "Search the agency service catalog for guidance "
                        "related to the caller's issue."
                    ),
                    "method": "POST",
                    "url": f"{base_url}/tools/search-service-catalog",
                    "parameters": _build_tool_parameters(agency_id),
                    "body": _build_tool_schema(
                        ["issue_description"],
                        {
                            "agency_id": {"type": "string"},
                            "issue_description": {"type": "string"},
                            "top_k": {"type": "number"},
                        },
                    ),
                },
                {
                    "type": "apiRequest",
                    "name": "create_ticket",
                    "description": "Create a maintenance ticket and the initial audit event.",
                    "method": "POST",
                    "url": f"{base_url}/tools/create-ticket",
                    "parameters": _build_tool_parameters(agency_id),
                    "body": _build_tool_schema(
                        [
                            "managed_unit_id",
                            "caller_name",
                            "caller_phone",
                            "issue_summary",
                            "issue_details",
                            "priority",
                        ],
                        {
                            "agency_id": {"type": "string"},
                            "managed_unit_id": {"type": "string"},
                            "caller_name": {"type": "string"},
                            "caller_phone": {"type": "string"},
                            "issue_summary": {"type": "string"},
                            "issue_details": {"type": "string"},
                            "category": {"type": "string"},
                            "priority": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "urgent"],
                            },
                            "source_metadata": {"type": "object"},
                        },
                    ),
                },
                {
                    "type": "apiRequest",
                    "name": "check_transfer_eligibility",
                    "description": (
                        "Check whether the call may be transferred "
                        "to the office right now."
                    ),
                    "method": "POST",
                    "url": f"{base_url}/tools/check-transfer-eligibility",
                    "parameters": _build_tool_parameters(agency_id),
                    "body": _build_tool_schema(
                        [],
                        {
                            "agency_id": {"type": "string"},
                            "reason": {"type": "string"},
                        },
                    ),
                },
                {
                    "type": "apiRequest",
                    "name": "handle_out_of_context",
                    "description": "Handle unsupported or off-domain requests safely.",
                    "method": "POST",
                    "url": f"{base_url}/tools/handle-out-of-context",
                    "parameters": _build_tool_parameters(agency_id),
                    "body": _build_tool_schema(
                        ["user_request"],
                        {
                            "agency_id": {"type": "string"},
                            "user_request": {"type": "string"},
                        },
                    ),
                },
            ],
        },
    }


def _build_local_phone_number(agency_id: str) -> str:
    digits = "".join(character for character in agency_id if character.isdigit())
    if len(digits) < 7:
        digest = hashlib.sha256(agency_id.encode("utf-8")).hexdigest()
        digits += "".join(character for character in digest if character.isdigit())
    local_tail = digits[:7].ljust(7, "0")
    return f"+1555{local_tail}"


def _use_local_fallback() -> bool:
    settings = get_settings()
    return not settings.vapi_api_key or settings.vapi_api_key.startswith("local_")


def _extract_phone_number(payload: dict[str, Any]) -> str | None:
    direct_number = payload.get("number")
    if isinstance(direct_number, str) and direct_number.strip():
        return direct_number.strip()

    fallback_destination = payload.get("fallbackDestination")
    if isinstance(fallback_destination, dict):
        fallback_number = fallback_destination.get("number")
        if isinstance(fallback_number, str) and fallback_number.strip():
            return fallback_number.strip()

    return None


async def provision_agency(agency_id: str) -> dict:
    async with connection() as conn:
        agency_record = await conn.fetchrow(
            """
            select id, name, office_address, contact_number, transfer_number, timezone,
                   onboarding_status, vapi_assistant_id, vapi_phone_number_id, vapi_phone_number
            from public.agencies
            where id = $1
            """,
            agency_id,
        )

        if not agency_record:
            raise ValueError("Agency not found.")

        latest_document = await conn.fetchrow(
            """
            select id, ingestion_status
            from public.service_catalog_documents
            where agency_id = $1
            order by created_at desc
            limit 1
            """,
            agency_id,
        )

        if not latest_document or latest_document["ingestion_status"] != "ready":
            await conn.execute(
                "update public.agencies set onboarding_status = 'catalog_processing' where id = $1",
                agency_id,
            )
            raise ValueError("Catalog ingestion must be ready before provisioning can continue.")

        if agency_record["vapi_assistant_id"] and agency_record["vapi_phone_number"]:
            if agency_record["onboarding_status"] != "ready":
                await conn.execute(
                    "update public.agencies set onboarding_status = 'ready' where id = $1",
                    agency_id,
                )
            return {
                "assistant_id": agency_record["vapi_assistant_id"],
                "phone_number_id": agency_record["vapi_phone_number_id"],
                "phone_number": agency_record["vapi_phone_number"],
                "status": "ready",
                "mode": "existing",
            }

        business_hours_rows = await conn.fetch(
            """
            select weekday, start_time_local, end_time_local, is_closed
            from public.agency_business_hours
            where agency_id = $1
            order by weekday asc
            """,
            agency_id,
        )

        await conn.execute(
            "update public.agencies set onboarding_status = 'provisioning' where id = $1",
            agency_id,
        )

    try:
        hours = _hours_summary([dict(row) for row in business_hours_rows])

        if _use_local_fallback():
            assistant_id = f"local-assistant-{agency_id[:8]}"
            phone_number_id = f"local-phone-{agency_id[:8]}"
            phone_number = _build_local_phone_number(agency_id)
            mode = "local"
        else:
            assistant_payload = _build_assistant_payload(dict(agency_record), hours)
            assistant = await create_assistant(assistant_payload)
            assistant_id = assistant["id"]

            phone_number_payload = await create_phone_number(
                {
                    "provider": "vapi",
                    "assistantId": assistant_id,
                    "name": f"{agency_record['name'][:40]} Line",
                }
            )
            phone_number_id = phone_number_payload["id"]
            mode = "live"
            phone_number = _extract_phone_number(phone_number_payload)

            if not phone_number:
                resolved_phone_payload = await get_phone_number(phone_number_id)
                phone_number = _extract_phone_number(resolved_phone_payload)

            if not phone_number:
                async with connection() as conn:
                    await conn.execute(
                        """
                        update public.agencies
                        set vapi_assistant_id = $2,
                            vapi_phone_number_id = $3,
                            vapi_phone_number = null,
                            onboarding_status = 'failed'
                        where id = $1
                        """,
                        agency_id,
                        assistant_id,
                        phone_number_id,
                    )

                raise ManualPhoneSetupRequiredError(
                    "Vapi created the phone-number resource, but no callable phone number was "
                    "returned by the API. This Vapi account may require completing phone-number "
                    "provisioning in the Vapi dashboard or using a BYO phone-number provider."
                )

        async with connection() as conn:
            await conn.execute(
                """
                update public.agencies
                set vapi_assistant_id = $2,
                    vapi_phone_number_id = $3,
                    vapi_phone_number = $4,
                    onboarding_status = 'ready'
                where id = $1
                """,
                agency_id,
                assistant_id,
                phone_number_id,
                phone_number,
            )

        logger.info("Provisioning complete for agency=%s mode=%s", agency_id, mode)

        return {
            "assistant_id": assistant_id,
            "phone_number_id": phone_number_id,
            "phone_number": phone_number,
            "status": "ready",
            "mode": mode,
        }
    except Exception as exc:
        async with connection() as conn:
            await conn.execute(
                "update public.agencies set onboarding_status = 'failed' where id = $1",
                agency_id,
            )

        if isinstance(exc, ManualPhoneSetupRequiredError):
            logger.warning("Provisioning requires manual phone setup for agency=%s", agency_id)
            raise

        logger.exception("Provisioning failed for agency=%s", agency_id)
        if isinstance(exc, VapiRequestError) and exc.status_code in {401, 403}:
            raise RuntimeError(
                "Provisioning failed: Vapi rejected the API key. "
                "Use the correct Vapi server/private key in VAPI_API_KEY."
            ) from exc
        raise RuntimeError(f"Provisioning failed: {exc}") from exc
