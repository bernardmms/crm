import { Injectable, Logger } from '@nestjs/common';

export type ProspectingRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface RunCreatePayload {
  industry: string;
  geo: string;
  produto: string;
  target_titles?: string[];
  company_size?: string;
  max_leads?: number;
  min_score?: number;
  dry_run?: boolean;
}

export interface RunSummary {
  run_id: string;
  status: ProspectingRunStatus;
  icp: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
  metrics: {
    companies_found?: number;
    leads_found?: number;
    leads_qualified?: number;
    avg_score?: number;
  } | null;
}

export interface LeadItem {
  id: string;
  company_id: string;
  company_name: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  email_confidence: 'verified' | 'guessed' | 'scraped' | null;
  phone: string | null;
  linkedin: string | null;
  instagram: string | null;
  outreach_status: string;
  score: number | null;
  score_reason: string | null;
  bant: {
    budget?: string | null;
    authority?: string | null;
    need?: string | null;
    timeline?: string | null;
  } | null;
  red_flags: string[] | null;
  suggested_angle: string | null;
  run_id: string;
  created_at: string;
}

const DEFAULT_BASE_URL = 'http://localhost:8000';

@Injectable()
export class ProspectingService {
  private readonly logger = new Logger(ProspectingService.name);
  private readonly baseUrl: string;

  constructor() {
    const configured = process.env.PROSPECTING_API_URL?.trim();
    this.baseUrl = (configured && configured.length > 0 ? configured : DEFAULT_BASE_URL).replace(
      /\/+$/,
      '',
    );
    this.logger.log(`Prospecting API base URL: ${this.baseUrl}`);
  }

  private async request<T>(
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const hasBody = init?.body !== undefined;
    const response = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(init?.body) : undefined,
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const text = await response.text();
        if (text) detail = text;
      } catch {
        /* ignore */
      }
      throw new Error(`Prospecting API ${path} failed: ${detail}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  createRun(payload: RunCreatePayload) {
    return this.request<RunSummary>('/runs', { method: 'POST', body: payload });
  }

  getRun(runId: string) {
    return this.request<RunSummary>(`/runs/${runId}`);
  }

  listRunLeads(runId: string) {
    return this.request<LeadItem[]>(`/runs/${runId}/leads`);
  }
}
