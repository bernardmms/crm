from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class IcpPayload(BaseModel):
    industry: str
    geo: str
    produto: str
    target_titles: list[str] | None = None
    company_size: str | None = None
    max_leads: int = Field(default=50, ge=1, le=500)
    min_score: int = Field(default=7, ge=0, le=10)
    dry_run: bool = False


class RunMetrics(BaseModel):
    companies_found: int | None = None
    leads_found: int | None = None
    leads_qualified: int | None = None
    avg_score: float | None = None


class RunSummary(BaseModel):
    run_id: str
    status: RunStatus
    icp: dict[str, Any]
    started_at: datetime
    finished_at: datetime | None = None
    metrics: RunMetrics | None = None


class ReportData(BaseModel):
    run_id: str
    total_companies: int
    total_leads: int
    qualified_leads: int
    avg_score: float | None = None
    top_industries: list[str]
    summary: str | None = None
    generated_at: datetime


# ── Companies ─────────────────────────────────────────────────────────────────

class CompanyItem(BaseModel):
    id: str
    name: str
    website: str | None = None
    phone: str | None = None
    full_address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    industry: str | None = None
    domain_age_days: int | None = None
    technologies: list[str] | None = None
    source: str | None = None
    instagram: str | None = None
    linkedin: str | None = None
    facebook: str | None = None
    run_id: str | None = None
    created_at: datetime


class CompanyDetail(CompanyItem):
    leads: list[LeadItem] = []


# ── Leads ─────────────────────────────────────────────────────────────────────

class EmailConfidence(str, Enum):
    verified = "verified"
    guessed = "guessed"
    scraped = "scraped"


class OutreachStatus(str, Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"
    cold = "cold"


class BantScore(BaseModel):
    budget: str | None = None
    authority: str | None = None
    need: str | None = None
    timeline: str | None = None


class LeadItem(BaseModel):
    id: str
    company_id: str | None = None
    company_name: str | None = None
    name: str | None = None
    title: str | None = None
    email: str | None = None
    email_confidence: EmailConfidence | None = None
    phone: str | None = None
    linkedin: str | None = None
    instagram: str | None = None
    outreach_status: OutreachStatus = OutreachStatus.pending
    score: int | None = None
    score_reason: str | None = None
    bant: BantScore | None = None
    red_flags: list[str] | None = None
    suggested_angle: str | None = None
    email_subject: str | None = None
    email_body: str | None = None
    follow_up_1: str | None = None
    follow_up_2: str | None = None
    hubspot_contact_id: str | None = None
    run_id: str | None = None
    created_at: datetime


class LeadDetail(LeadItem):
    company: CompanyItem | None = None
    outreach_history: list[OutreachItem] = []


CompanyDetail.model_rebuild()
LeadDetail.model_rebuild()


# ── Pagination ────────────────────────────────────────────────────────────────

class PaginatedCompanies(BaseModel):
    items: list[CompanyItem]
    total: int
    page: int
    page_size: int
    pages: int


class PaginatedLeads(BaseModel):
    items: list[LeadItem]
    total: int
    page: int
    page_size: int
    pages: int


# ── Outreach ──────────────────────────────────────────────────────────────────

class OutreachItem(BaseModel):
    id: int
    lead_id: str | None = None
    lead_company: str | None = None
    to_email: str
    sent_at: datetime | None = None
    provider: str | None = None
    subject: str | None = None
    dry_run: bool = False
    opened_at: datetime | None = None
    clicked_at: datetime | None = None


class LeadStatusUpdate(BaseModel):
    status: OutreachStatus


class OutreachRequest(BaseModel):
    message: str | None = None
    channel: str = "email"


class OutreachResponse(BaseModel):
    lead_id: str
    channel: str
    queued_at: datetime
    dry_run: bool


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    supabase: str
    version: str = "1.0.0"
