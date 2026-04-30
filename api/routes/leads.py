from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_db
from api.schemas.responses import (
    CompanyItem,
    LeadDetail,
    LeadItem,
    LeadStatusUpdate,
    OutreachItem,
    OutreachRequest,
    OutreachResponse,
    PaginatedLeads,
)

router = APIRouter(prefix="/leads", tags=["leads"])

DbDep = Annotated[Any, Depends(get_db)]


@router.get("", response_model=PaginatedLeads)
async def list_leads(
    db: DbDep,
    page: int = 1,
    page_size: int = 20,
    score_min: float | None = None,
    score_max: float | None = None,
    status: str | None = None,
    has_email: bool | None = None,
) -> PaginatedLeads:
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    offset = (page - 1) * page_size

    query = db.table("prospecting_leads").select("*", count="exact")
    if score_min is not None:
        query = query.gte("score", score_min)
    if score_max is not None:
        query = query.lte("score", score_max)
    if status:
        query = query.eq("outreach_status", status)
    if has_email is True:
        query = query.not_.is_("email", "null")
    elif has_email is False:
        query = query.is_("email", "null")

    result = await query.order("score", desc=True, nullsfirst=False).range(offset, offset + page_size - 1).execute()

    total = result.count or 0
    return PaginatedLeads(
        items=[LeadItem(**r) for r in (result.data or [])],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 1,
    )


@router.get("/{lead_id}", response_model=LeadDetail)
async def get_lead(lead_id: str, db: DbDep) -> LeadDetail:
    lead_result = await (
        db.table("prospecting_leads").select("*").eq("id", lead_id).maybe_single().execute()
    )
    if not lead_result.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    row = lead_result.data
    company: CompanyItem | None = None
    if row.get("company_id"):
        company_result = await (
            db.table("prospecting_companies").select("*").eq("id", row["company_id"]).maybe_single().execute()
        )
        if company_result.data:
            company = CompanyItem(**company_result.data)

    outreach_result = await (
        db.table("outreach").select("*").eq("lead_id", lead_id).order("sent_at", desc=True).execute()
    )

    return LeadDetail(
        **row,
        company=company,
        outreach_history=[OutreachItem(**o) for o in (outreach_result.data or [])],
    )


@router.patch("/{lead_id}/status", response_model=LeadItem)
async def update_lead_status(lead_id: str, body: LeadStatusUpdate, db: DbDep) -> LeadItem:
    result = await (
        db.table("prospecting_leads")
        .update({"outreach_status": body.status.value})
        .eq("id", lead_id)
        .select()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadItem(**result.data[0])


@router.post("/{lead_id}/outreach", response_model=OutreachResponse)
async def trigger_outreach(lead_id: str, body: OutreachRequest, db: DbDep) -> OutreachResponse:
    lead_result = await (
        db.table("prospecting_leads").select("id, email, company_name, outreach_status").eq("id", lead_id).maybe_single().execute()
    )
    if not lead_result.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead = lead_result.data
    if not lead.get("email"):
        raise HTTPException(status_code=422, detail="Lead has no email address")

    now = datetime.now(timezone.utc)
    dry_run = body.channel == "dry_run"

    outreach_row = {
        "lead_id": lead_id,
        "lead_company": lead.get("company_name"),
        "to_email": lead["email"],
        "provider": body.channel,
        "subject": body.message,
        "dry_run": dry_run,
        "sent_at": now.isoformat(),
    }

    await db.table("outreach").insert(outreach_row).execute()

    if not dry_run:
        await (
            db.table("leads")
            .update({"outreach_status": "sent"})
            .eq("id", lead_id)
            .execute()
        )
        # TODO: integrate real email/LinkedIn dispatch here

    return OutreachResponse(
        lead_id=lead_id,
        channel=body.channel,
        queued_at=now,
        dry_run=dry_run,
    )
