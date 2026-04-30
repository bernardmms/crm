const DEFAULT_BASE_URL = "http://localhost:8000";

function getBaseUrl() {
  return import.meta.env.VITE_PROSPECTING_API_URL ?? DEFAULT_BASE_URL;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = (await response.json()) as {
          detail?: unknown;
          message?: unknown;
          error?: unknown;
        };

        if (typeof body.detail === "string") {
          detail = body.detail;
        } else if (Array.isArray(body.detail)) {
          detail = body.detail
            .map((item) => {
              if (typeof item === "string") return item;
              if (item && typeof item === "object" && "msg" in item) {
                return String(item.msg);
              }
              return JSON.stringify(item);
            })
            .join(" | ");
        } else if (typeof body.message === "string") {
          detail = body.message;
        } else if (typeof body.error === "string") {
          detail = body.error;
        }
      } else {
        const raw = (await response.text()).trim();
        if (raw) detail = raw;
      }
    } catch {
      // fallback to status code
    }
    throw new Error(detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function toQuery(params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProspectingRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type RunCreatePayload = {
  industry: string;
  geo: string;
  produto: string;
  target_titles?: string[];
  company_size?: string;
  max_leads?: number;
  min_score?: number;
  dry_run?: boolean;
};

export type RunMetrics = {
  companies_found?: number;
  leads_found?: number;
  leads_qualified?: number;
  avg_score?: number;
};

export type RunSummary = {
  run_id: string;
  status: ProspectingRunStatus;
  icp: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
  metrics: RunMetrics | null;
};

export type CompanyItem = {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  domain_age_days: number | null;
  technologies: string[] | null;
  source: string | null;
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  run_id: string;
  created_at: string;
};

export type PaginatedCompanies = {
  items: CompanyItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type EmailConfidence = "verified" | "guessed" | "scraped";
export type OutreachStatus = "pending" | "sent" | "failed" | "cold";

export type BantScore = {
  budget?: string | null;
  authority?: string | null;
  need?: string | null;
  timeline?: string | null;
};

export type LeadItem = {
  id: string;
  company_id: string;
  company_name: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  email_confidence: EmailConfidence | null;
  phone: string | null;
  linkedin: string | null;
  instagram: string | null;
  outreach_status: OutreachStatus;
  score: number | null;
  score_reason: string | null;
  bant: BantScore | null;
  red_flags: string[] | null;
  suggested_angle: string | null;
  email_subject: string | null;
  email_body: string | null;
  follow_up_1: string | null;
  follow_up_2: string | null;
  hubspot_contact_id: string | null;
  run_id: string;
  created_at: string;
};

export type PaginatedLeads = {
  items: LeadItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type StreamEvent = {
  event: string;
  node: string;
  data: Record<string, unknown>;
};

// ─── API client ───────────────────────────────────────────────────────────────

export const prospectingApi = {
  getBaseUrl,

  createRun(payload: RunCreatePayload) {
    return request<RunSummary>("/runs", { method: "POST", body: payload });
  },

  listRuns(params?: { status?: string; limit?: number; offset?: number }) {
    return request<RunSummary[]>(`/runs${toQuery(params ?? {})}`);
  },

  getRun(runId: string) {
    return request<RunSummary>(`/runs/${runId}`);
  },

  listRunCompanies(runId: string) {
    return request<CompanyItem[]>(`/runs/${runId}/companies`);
  },

  listRunLeads(runId: string) {
    return request<LeadItem[]>(`/runs/${runId}/leads`);
  },

  listCompanies(params?: {
    page?: number;
    page_size?: number;
    source?: string;
    city?: string;
  }) {
    return request<PaginatedCompanies>(`/companies${toQuery(params ?? {})}`);
  },

  listLeads(params?: {
    page?: number;
    page_size?: number;
    score_min?: number;
    score_max?: number;
    status?: string;
    has_email?: boolean;
  }) {
    return request<PaginatedLeads>(`/leads${toQuery(params ?? {})}`);
  },

  updateLeadStatus(leadId: string, status: OutreachStatus) {
    return request<LeadItem>(`/leads/${leadId}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  openRunStream(runId: string) {
    return new EventSource(`${getBaseUrl()}/runs/${runId}/stream`);
  },
};
