"""Background run management: asyncio tasks + per-run SSE queues."""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from supabase import AsyncClient

from api.schemas.responses import IcpPayload, RunStatus

# ─── In-memory registry ───────────────────────────────────────────────────────

@dataclass
class RunContext:
    run_id: str
    task: asyncio.Task[None]
    cancel_event: asyncio.Event
    sse_queue: asyncio.Queue[dict[str, Any]]


_active: dict[str, RunContext] = {}


def get_active(run_id: str) -> RunContext | None:
    return _active.get(run_id)


# ─── SSE helper ───────────────────────────────────────────────────────────────

async def _emit(ctx: RunContext, event: str, node: str, data: dict[str, Any]) -> None:
    await ctx.sse_queue.put({"event": event, "node": node, "data": data})


# ─── Pipeline ─────────────────────────────────────────────────────────────────

async def _run_agent(ctx: RunContext, icp: IcpPayload, db: AsyncClient) -> None:
    """
    Orchestrates the prospecting pipeline node by node.

    Replace each _stub_* call with real agent logic.
    Tables written:
      - companies  (run_id column required — add via migration)
      - leads      (run_id column required — add via migration)
    """
    run_id = ctx.run_id

    async def set_status(s: RunStatus, extra: dict | None = None) -> None:
        payload: dict[str, Any] = {"status": s.value}
        if extra:
            payload.update(extra)
        await db.table("prospecting_runs").update(payload).eq("run_id", run_id).execute()

    try:
        await set_status(RunStatus.running)

        # ── search_companies ──────────────────────────────────────
        if ctx.cancel_event.is_set():
            return
        await _emit(ctx, "node_start", "search_companies", {"icp": icp.model_dump()})
        companies: list[dict[str, Any]] = await _stub_search_companies(icp)
        if companies:
            await db.table("prospecting_companies").insert(
                [{"run_id": run_id, **c} for c in companies]
            ).execute()
        await _emit(ctx, "node_end", "search_companies", {"found": len(companies)})

        # ── enrich_companies ──────────────────────────────────────
        if ctx.cancel_event.is_set():
            return
        await _emit(ctx, "node_start", "enrich_companies", {"count": len(companies)})
        # TODO: enrich via CNPJ API / website scraping / LinkedIn
        await asyncio.sleep(0)
        await _emit(ctx, "node_end", "enrich_companies", {"enriched": len(companies)})

        # ── find_leads ────────────────────────────────────────────
        if ctx.cancel_event.is_set():
            return
        await _emit(ctx, "node_start", "find_leads", {"companies": len(companies)})
        leads: list[dict[str, Any]] = await _stub_find_leads(companies, icp)
        await _emit(ctx, "node_end", "find_leads", {"leads": len(leads)})

        # ── score_leads ───────────────────────────────────────────
        if ctx.cancel_event.is_set():
            return
        await _emit(ctx, "node_start", "score_leads", {"leads": len(leads)})
        # TODO: LLM-based ICP scoring; populate score, score_reason, bant, red_flags, suggested_angle, email templates
        scored = await _stub_score_leads(leads, icp)
        await _emit(ctx, "node_end", "score_leads", {"scored": len(scored)})

        # ── filter_leads ──────────────────────────────────────────
        if ctx.cancel_event.is_set():
            return
        qualified = [l for l in scored if (l.get("score") or 0) >= icp.min_score]
        qualified = qualified[: icp.max_leads]
        await _emit(ctx, "node_start", "filter_leads", {"min_score": icp.min_score})
        if qualified:
            await db.table("prospecting_leads").insert(
                [{"run_id": run_id, **l} for l in qualified]
            ).execute()
        await _emit(ctx, "node_end", "filter_leads", {"qualified": len(qualified)})

        # ── generate_report ───────────────────────────────────────
        if ctx.cancel_event.is_set():
            return
        await _emit(ctx, "node_start", "generate_report", {})

        scores = [l.get("score") or 0 for l in qualified]
        avg = round(sum(scores) / len(scores), 2) if scores else None
        industries = list({c.get("industry") for c in companies if c.get("industry")})[:5]

        metrics = {
            "companies_found": len(companies),
            "leads_found": len(leads),
            "leads_qualified": len(qualified),
            "avg_score": avg,
        }
        report = {**metrics, "top_industries": industries}

        await set_status(
            RunStatus.completed,
            {
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "metrics": metrics,
                "report": report,
            },
        )
        await _emit(ctx, "completed", "generate_report", report)

    except asyncio.CancelledError:
        await set_status(RunStatus.cancelled, {"finished_at": datetime.now(timezone.utc).isoformat()})
        await _emit(ctx, "cancelled", "pipeline", {"reason": "user requested cancellation"})
        raise

    except Exception as exc:
        await set_status(
            RunStatus.failed,
            {"finished_at": datetime.now(timezone.utc).isoformat(), "error": str(exc)},
        )
        await _emit(ctx, "error", "pipeline", {"error": str(exc)})

    finally:
        _active.pop(run_id, None)


# ─── Public API ───────────────────────────────────────────────────────────────

async def start_run(icp: IcpPayload, db: AsyncClient) -> str:
    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.table("prospecting_runs").insert({
        "run_id": run_id,
        "status": RunStatus.pending.value,
        "icp": icp.model_dump(),
        "started_at": now.isoformat(),
    }).execute()

    cancel_event = asyncio.Event()
    sse_queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)
    ctx = RunContext(run_id=run_id, task=None, cancel_event=cancel_event, sse_queue=sse_queue)  # type: ignore[arg-type]
    ctx.task = asyncio.create_task(_run_agent(ctx, icp, db))
    _active[run_id] = ctx

    return run_id


async def cancel_run(run_id: str) -> bool:
    ctx = _active.get(run_id)
    if ctx is None:
        return False
    ctx.cancel_event.set()
    ctx.task.cancel()
    return True


# ─── Stubs (replace with real agent nodes) ────────────────────────────────────

async def _stub_search_companies(icp: IcpPayload) -> list[dict[str, Any]]:
    await asyncio.sleep(0.1)
    return []


async def _stub_find_leads(companies: list[dict], icp: IcpPayload) -> list[dict[str, Any]]:
    await asyncio.sleep(0.1)
    return []


async def _stub_score_leads(leads: list[dict], icp: IcpPayload) -> list[dict[str, Any]]:
    await asyncio.sleep(0.1)
    return leads
