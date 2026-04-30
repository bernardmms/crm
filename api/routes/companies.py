from __future__ import annotations

import math
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_db
from api.schemas.responses import CompanyDetail, CompanyItem, LeadItem, PaginatedCompanies

router = APIRouter(prefix="/companies", tags=["companies"])

DbDep = Annotated[Any, Depends(get_db)]


@router.get("", response_model=PaginatedCompanies)
async def list_companies(
    db: DbDep,
    page: int = 1,
    page_size: int = 20,
    source: str | None = None,
    city: str | None = None,
) -> PaginatedCompanies:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    offset = (page - 1) * page_size

    query = db.table("prospecting_companies").select("*", count="exact")
    if source:
        query = query.eq("source", source)
    if city:
        query = query.ilike("city", f"%{city}%")

    result = await query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    total = result.count or 0
    return PaginatedCompanies(
        items=[CompanyItem(**r) for r in (result.data or [])],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 1,
    )


@router.get("/{company_id}", response_model=CompanyDetail)
async def get_company(company_id: str, db: DbDep) -> CompanyDetail:
    company_result = await (
        db.table("prospecting_companies").select("*").eq("id", company_id).maybe_single().execute()
    )
    if not company_result.data:
        raise HTTPException(status_code=404, detail="Company not found")

    leads_result = await (
        db.table("prospecting_leads").select("*").eq("company_id", company_id).order("score", desc=True).execute()
    )

    return CompanyDetail(
        **company_result.data,
        leads=[LeadItem(**l) for l in (leads_result.data or [])],
    )

from __future__ import annotations

import math
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_db
from api.schemas.responses import CompanyDetail, CompanyItem, LeadItem, PaginatedCompanies

router = APIRouter(prefix="/companies", tags=["companies"])

DbDep = Annotated[Any, Depends(get_db)]


@router.get("", response_model=PaginatedCompanies)
async def list_companies(
    db: DbDep,
    page: int = 1,
    page_size: int = 20,
    source: str | None = None,
    city: str | None = None,
) -> PaginatedCompanies:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    offset = (page - 1) * page_size

    query = db.table("prospecting_companies").select("*", count="exact")
    if source:
        query = query.eq("source", source)
    if city:
        query = query.ilike("city", f"%{city}%")

    result = await query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    total = result.count or 0
    return PaginatedCompanies(
        items=[CompanyItem(**r) for r in (result.data or [])],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 1,
    )


@router.get("/{company_id}", response_model=CompanyDetail)
async def get_company(company_id: str, db: DbDep) -> CompanyDetail:
    company_result = await (
        db.table("prospecting_companies").select("*").eq("id", company_id).maybe_single().execute()
    )
    if not company_result.data:
        raise HTTPException(status_code=404, detail="Company not found")

    leads_result = await (
        db.table("prospecting_leads").select("*").eq("company_id", company_id).order("score", desc=True).execute()
    )

    return CompanyDetail(
        **company_result.data,
        leads=[LeadItem(**l) for l in (leads_result.data or [])],
    )
