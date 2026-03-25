import json
import re
from datetime import UTC, datetime

from app.db.pool import connection
from app.services.catalog import search_catalog


def _tokenize(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def _score_address_match(input_address: str, stored_display_address: str) -> float:
    input_tokens = _tokenize(input_address)
    stored_tokens = _tokenize(stored_display_address)

    if not input_tokens or not stored_tokens:
        return 0.0

    overlap = len(input_tokens & stored_tokens)
    return overlap / max(len(input_tokens), 1)


async def validate_managed_unit(
    agency_id: str,
    property_address: str,
    unit_number: str,
) -> dict:
    async with connection() as conn:
        candidates = await conn.fetch(
            """
            select id, display_address, property_address_line_1, city, state, postal_code
            from public.managed_units
            where agency_id = $1
              and is_active = true
              and lower(unit_number) = lower($2)
            limit 25
            """,
            agency_id,
            unit_number.strip(),
        )

    if not candidates:
        return {
            "is_managed": False,
            "managed_unit_id": None,
            "normalized_address": None,
            "clarification_needed": True,
            "message_for_agent": "That unit was not found in the agency's managed residences.",
        }

    scored = sorted(
        (
            (
                _score_address_match(property_address, row["display_address"]),
                row,
            )
            for row in candidates
        ),
        key=lambda item: item[0],
        reverse=True,
    )

    best_score, best_match = scored[0]

    if best_score < 0.35:
        return {
            "is_managed": False,
            "managed_unit_id": None,
            "normalized_address": None,
            "clarification_needed": True,
            "message_for_agent": (
                "The unit number exists, but the address "
                "needs clarification before continuing."
            ),
        }

    return {
        "is_managed": True,
        "managed_unit_id": str(best_match["id"]),
        "normalized_address": best_match["display_address"],
        "clarification_needed": False,
        "message_for_agent": (
            "Managed unit confirmed. Continue with service guidance "
            "or ticket intake."
        ),
    }


async def create_ticket(
    agency_id: str,
    managed_unit_id: str,
    caller_name: str,
    caller_phone: str,
    issue_summary: str,
    issue_details: str,
    category: str | None,
    priority: str,
    source_metadata: dict | None,
) -> dict:
    metadata = source_metadata or {}

    async with connection() as conn:
        ticket = await conn.fetchrow(
            """
            insert into public.tickets (
              agency_id,
              managed_unit_id,
              status,
              priority,
              category,
              issue_summary,
              issue_details,
              caller_name,
              caller_phone,
              created_by_channel_metadata
            )
            values ($1, $2, 'new', $3::public.ticket_priority, $4, $5, $6, $7, $8, $9::jsonb)
            returning id, status
            """,
            agency_id,
            managed_unit_id,
            priority,
            category,
            issue_summary,
            issue_details,
            caller_name,
            caller_phone,
            json.dumps(metadata),
        )

        await conn.execute(
            """
            insert into public.ticket_events (
              agency_id,
              ticket_id,
              event_type,
              event_payload,
              actor_type
            )
            values ($1, $2, 'ticket_created', $3::jsonb, 'voice_assistant')
            """,
            agency_id,
            ticket["id"],
            json.dumps(
                {
                    "source": "voice",
                    "issue_summary": issue_summary,
                    "priority": priority,
                }
            ),
        )

        vapi_call_id = metadata.get("vapi_call_id")

        if isinstance(vapi_call_id, str) and vapi_call_id.strip():
            await conn.execute(
                """
                insert into public.calls (
                  agency_id,
                  vapi_call_id,
                  caller_phone,
                  caller_name,
                  managed_unit_id,
                  call_outcome,
                  transfer_attempted,
                  transfer_completed
                )
                values ($1, $2, $3, $4, $5, 'ticket_created', false, false)
                on conflict (vapi_call_id) do update
                set agency_id = excluded.agency_id,
                    caller_phone = excluded.caller_phone,
                    caller_name = excluded.caller_name,
                    managed_unit_id = excluded.managed_unit_id,
                    call_outcome = excluded.call_outcome,
                    updated_at = timezone('utc', now())
                """,
                agency_id,
                vapi_call_id,
                caller_phone,
                caller_name,
                managed_unit_id,
            )

    return {
        "ticket_id": str(ticket["id"]),
        "status": ticket["status"],
        "confirmation_message": (
            "The maintenance ticket has been created "
            "and shared with the office."
        ),
    }


async def check_transfer_eligibility(agency_id: str, reason: str | None = None) -> dict:
    async with connection() as conn:
        agency = await conn.fetchrow(
            """
            select id, transfer_number, timezone, name, office_address
            from public.agencies
            where id = $1
            """,
            agency_id,
        )
        is_open = await conn.fetchval(
            "select public.agency_is_open($1, $2)",
            agency_id,
            datetime.now(UTC),
        )

    if not agency:
        raise ValueError("Agency not found.")

    if not agency["transfer_number"]:
        return {
            "transfer_allowed": False,
            "transfer_number": None,
            "message_for_agent": "The office does not have a transfer number configured yet.",
            "reason_code": "missing_transfer_number",
        }

    if not is_open:
        return {
            "transfer_allowed": False,
            "transfer_number": None,
            "message_for_agent": (
                "The office is outside business hours, "
                "so offer ticket creation instead."
            ),
            "reason_code": "after_hours",
        }

    return {
        "transfer_allowed": True,
        "transfer_number": agency["transfer_number"],
        "message_for_agent": (
            "Transfer is allowed now. "
            f"Route the caller to {agency['transfer_number']} if requested."
        ),
        "reason_code": "allowed",
        "reason": reason,
    }


def handle_out_of_context(user_request: str) -> dict:
    normalized = user_request.lower()

    classifications = [
        ("leasing_or_sales", ["lease", "tour", "availability", "rent"]),
        ("billing_or_account", ["bill", "payment", "balance", "account"]),
        ("general_office_info", ["hours", "office", "location", "email"]),
        ("emergency_outside_catalog", ["police", "ambulance", "fire department", "medical"]),
    ]

    for classification, keywords in classifications:
        if any(keyword in normalized for keyword in keywords):
            return {
                "classification": classification,
                "recommended_response": (
                    "Explain that the line is for maintenance support, "
                    "then offer the office number if appropriate."
                ),
                "offer_transfer": classification in {"general_office_info", "billing_or_account"},
                "offer_ticket": False,
            }

    return {
        "classification": "unsupported",
        "recommended_response": (
            "Politely explain that the request is outside maintenance support "
            "and offer the office number."
        ),
        "offer_transfer": True,
        "offer_ticket": False,
    }


async def search_service_catalog(
    agency_id: str,
    issue_description: str,
    top_k: int = 5,
) -> dict:
    return await search_catalog(agency_id, issue_description, top_k)
