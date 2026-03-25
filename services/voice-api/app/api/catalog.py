from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.catalog import process_catalog_document, search_catalog

router = APIRouter(prefix="/catalog", tags=["catalog"])


class CatalogProcessRequest(BaseModel):
    agency_id: str = Field(min_length=1)
    document_id: str = Field(min_length=1)


class CatalogSearchRequest(BaseModel):
    agency_id: str = Field(min_length=1)
    issue_description: str = Field(min_length=3)
    top_k: int = Field(default=5, ge=1, le=10)


@router.post("/process")
async def process_catalog(request: CatalogProcessRequest) -> dict:
    try:
        return await process_catalog_document(request.agency_id, request.document_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/search")
async def search_catalog_route(request: CatalogSearchRequest) -> dict:
    try:
        return await search_catalog(request.agency_id, request.issue_description, request.top_k)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
