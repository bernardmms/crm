from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.deps import get_client
from api.routes import companies, leads, runs
from api.schemas.responses import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Warm up the Supabase client on startup
    await get_client()
    yield


app = FastAPI(
    title="Prospecting Agent API",
    description="REST + SSE interface for the AI-powered prospecting agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(runs.router)
app.include_router(companies.router)
app.include_router(leads.router)


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    try:
        db = await get_client()
        await db.table("prospecting_runs").select("run_id").limit(1).execute()
        supabase_status = "ok"
    except Exception as exc:
        supabase_status = f"error: {exc}"

    return HealthResponse(
        status="ok" if supabase_status == "ok" else "degraded",
        supabase=supabase_status,
    )


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=settings.port, reload=True)

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.deps import get_client
from api.routes import companies, leads, runs
from api.schemas.responses import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Warm up the Supabase client on startup
    await get_client()
    yield


app = FastAPI(
    title="Prospecting Agent API",
    description="REST + SSE interface for the AI-powered prospecting agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(runs.router)
app.include_router(companies.router)
app.include_router(leads.router)


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    try:
        db = await get_client()
        await db.table("prospecting_runs").select("run_id").limit(1).execute()
        supabase_status = "ok"
    except Exception as exc:
        supabase_status = f"error: {exc}"

    return HealthResponse(
        status="ok" if supabase_status == "ok" else "degraded",
        supabase=supabase_status,
    )


if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=settings.port, reload=True)
