from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.provisioning import ManualPhoneSetupRequiredError, provision_agency

router = APIRouter(prefix="/provisioning", tags=["provisioning"])


class ProvisionAgencyRequest(BaseModel):
    agency_id: str = Field(min_length=1)


@router.post("/provision")
async def provision_agency_route(request: ProvisionAgencyRequest) -> dict:
    try:
        return await provision_agency(request.agency_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ManualPhoneSetupRequiredError as exc:
        return JSONResponse(
            status_code=409,
            content={
                "detail": str(exc),
                "code": "manual_phone_setup_required",
            },
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
