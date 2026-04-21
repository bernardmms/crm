from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Annotated, Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sse_starlette.sse import EventSourceResponse

from api.background import cancel_run, get_active, start_run
from api.deps import get_db
from api.schemas.responses import (
    CompanyItem,
    IcpPayload,
    LeadItem,
    ReportData,
    RunStatus,
    RunSummary,
)

router = APIRouter(prefix="/runs", tags=["runs"])

DbDep = Annotated[Any, Depends(get_db)]


@router.post("", response_model=RunSummary, status_code=status.HTTP_202_ACCEPTED)
async def create_run(payload: IcpPayload, db: DbDep) -> RunSummary:
    """Start a new prospecting run in the background. Returns run_id immediately."""
    run_id = await start_run(payload, db)
    return RunSummary(
        run_id=run_id,
        status=RunStatus.pending,
        icp=payload.model_dump(),
        started_at=datetime.now(timezone.utc),
    )


@router.get("", response_model=list[RunSummary])
async def list_runs(
    db: DbDep,
    status: str | None = None,
    limit: int = 30,
    offset: int = 0,
) -> list[RunSummary]:
    try:
        query = (
            db.table("prospecting_runs")
            .select("*")
            .order("started_at", desc=True)
            .range(offset, offset + limit - 1)
        )
        if status:
            query = query.eq("status", status)
        result = await query.execute()
        return [_to_summary(r) for r in (result.data or [])]
    except Exception:
        return []


@router.get("/{run_id}", response_model=RunSummary)
async def get_run(run_id: str, db: DbDep) -> RunSummary:
    try:
        result = await (
            db.table("prospecting_runs").select("*").eq("run_id", run_id).maybe_single().execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Run not found")
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    return _to_summary(result.data)


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run(run_id: str, db: DbDep) -> None:
    result = await (
        db.table("prospecting_runs").select("status").eq("run_id", run_id).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    if result.data["status"] not in (RunStatus.pending.value, RunStatus.running.value):
        raise HTTPException(status_code=409, detail="Run is already finished")
    await cancel_run(run_id)


@router.get("/{run_id}/stream")
async def stream_run(run_id: str, request: Request, db: DbDep) -> EventSourceResponse:
    """
    SSE stream of real-time run progress.

    Each message: {"event": str, "node": str, "data": {...}}

    Events: node_start · node_end · completed · cancelled · error · ping (keepalive)
    """
    result = await (
        db.table("prospecting_runs").select("status").eq("run_id", run_id).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")

    ctx = get_active(run_id)

    async def generator() -> AsyncGenerator[dict, None]:
        if ctx is None:
            yield {"data": json.dumps({"event": result.data["status"], "node": "pipeline", "data": {}})}
            return

        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(ctx.sse_queue.get(), timeout=15.0)
                yield {"data": json.dumps(event)}
                if event.get("event") in ("completed", "cancelled", "error"):
                    break
            except asyncio.TimeoutError:
                yield {"data": json.dumps({"event": "ping", "node": "heartbeat", "data": {}})}

    return EventSourceResponse(generator())


@router.get("/{run_id}/companies", response_model=list[CompanyItem])
async def list_run_companies(run_id: str, db: DbDep) -> list[CompanyItem]:
    try:
        result = await (
            db.table("prospecting_companies").select("*").eq("run_id", run_id).order("created_at", desc=True).execute()
        )
        return [CompanyItem(**r) for r in (result.data or [])]
    except Exception:
        return []


@router.get("/{run_id}/leads", response_model=list[LeadItem])
async def list_run_leads(run_id: str, db: DbDep) -> list[LeadItem]:
    try:
        result = await (
            db.table("prospecting_leads").select("*").eq("run_id", run_id).order("score", desc=True, nullsfirst=False).execute()
        )
        return [LeadItem(**r) for r in (result.data or [])]
    except Exception:
        return []


@router.get("/{run_id}/report", response_model=ReportData)
async def get_run_report(run_id: str, db: DbDep) -> ReportData:
    result = await (
        db.table("prospecting_runs").select("*").eq("run_id", run_id).maybe_single().execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
    row = result.data
    if row["status"] != RunStatus.completed.value:
        raise HTTPException(status_code=409, detail="Report only available for completed runs")

    report = row.get("report") or {}
    return ReportData(
        run_id=run_id,
        total_companies=report.get("total_companies", 0),
        total_leads=report.get("total_leads", 0),
        qualified_leads=report.get("qualified_leads", 0),
        avg_score=report.get("avg_score"),
        top_industries=report.get("top_industries", []),
        summary=report.get("summary"),
        generated_at=row.get("finished_at") or datetime.now(timezone.utc),
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_summary(row: dict) -> RunSummary:
    from api.schemas.responses import RunMetrics
    metrics_raw = row.get("metrics")
    return RunSummary(
        run_id=row["run_id"],
        status=RunStatus(row["status"]),
        icp=row.get("icp") or {},
        started_at=row["started_at"],
        finished_at=row.get("finished_at"),
        metrics=RunMetrics(**metrics_raw) if isinstance(metrics_raw, dict) else None,
    )


def _require_run(result: Any) -> None:
    if not result.data:
        raise HTTPException(status_code=404, detail="Run not found")
