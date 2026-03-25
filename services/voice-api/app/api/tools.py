from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.services.tools import (
    check_transfer_eligibility,
    create_ticket,
    handle_out_of_context,
    search_service_catalog,
    validate_managed_unit,
)

router = APIRouter(prefix="/tools", tags=["tools"])


def resolve_agency_id(body_agency_id: str | None, header_agency_id: str | None) -> str:
    agency_id = body_agency_id or header_agency_id

    if not agency_id:
        raise HTTPException(status_code=400, detail="Agency id is required.")

    return agency_id


class ManagedUnitRequest(BaseModel):
    agency_id: str | None = None
    property_address: str = Field(min_length=3)
    unit_number: str = Field(min_length=1)


class CatalogToolRequest(BaseModel):
    agency_id: str | None = None
    issue_description: str = Field(min_length=3)
    top_k: int = Field(default=5, ge=1, le=10)


class TicketRequest(BaseModel):
    agency_id: str | None = None
    managed_unit_id: str = Field(min_length=1)
    caller_name: str = Field(min_length=1)
    caller_phone: str = Field(min_length=1)
    issue_summary: str = Field(min_length=3)
    issue_details: str = Field(min_length=3)
    category: str | None = None
    priority: str = Field(pattern="^(low|medium|high|urgent)$")
    source_metadata: dict | None = None


class TransferRequest(BaseModel):
    agency_id: str | None = None
    reason: str | None = None


class OutOfContextRequest(BaseModel):
    agency_id: str | None = None
    user_request: str = Field(min_length=3)


@router.post("/validate-managed-unit")
async def validate_managed_unit_route(
    request: ManagedUnitRequest,
    x_agency_id: str | None = Header(default=None),
) -> dict:
    agency_id = resolve_agency_id(request.agency_id, x_agency_id)

    try:
        return await validate_managed_unit(
            agency_id,
            request.property_address,
            request.unit_number,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/search-service-catalog")
async def search_service_catalog_route(
    request: CatalogToolRequest,
    x_agency_id: str | None = Header(default=None),
) -> dict:
    agency_id = resolve_agency_id(request.agency_id, x_agency_id)

    try:
        return await search_service_catalog(agency_id, request.issue_description, request.top_k)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/create-ticket")
async def create_ticket_route(
    request: TicketRequest,
    x_agency_id: str | None = Header(default=None),
) -> dict:
    agency_id = resolve_agency_id(request.agency_id, x_agency_id)

    try:
        return await create_ticket(
            agency_id=agency_id,
            managed_unit_id=request.managed_unit_id,
            caller_name=request.caller_name,
            caller_phone=request.caller_phone,
            issue_summary=request.issue_summary,
            issue_details=request.issue_details,
            category=request.category,
            priority=request.priority,
            source_metadata=request.source_metadata,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/check-transfer-eligibility")
async def check_transfer_eligibility_route(
    request: TransferRequest,
    x_agency_id: str | None = Header(default=None),
) -> dict:
    agency_id = resolve_agency_id(request.agency_id, x_agency_id)

    try:
        return await check_transfer_eligibility(agency_id, request.reason)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/handle-out-of-context")
async def handle_out_of_context_route(
    request: OutOfContextRequest,
    x_agency_id: str | None = Header(default=None),
) -> dict:
    resolve_agency_id(request.agency_id, x_agency_id)
    return handle_out_of_context(request.user_request)
