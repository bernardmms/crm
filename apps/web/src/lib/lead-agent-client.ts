export type LeadAgentJobInput = {
  industry: string;
  geo: string;
  produto: string;
  target_titles: string[];
  company_size?: string;
  max_leads?: number;
  min_score?: number;
  max_companies?: number;
};

export type LeadAgentCreateJobResult = {
  job_id: string;
  status: string;
  message: string;
};

export type LeadAgentJobStatus = {
  job_id: string;
  status: string;
  progress: number | null;
  current_funnel_stage: string | null;
  stage_counts: Record<string, number> | null;
  leads?: unknown[];
  total_leads: number | null;
  next_cursor?: string | null;
  drop_reasons_top: unknown[] | Record<string, number> | null;
  created_at: string;
  updated_at: string;
};

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export class LeadAgentServiceUnavailableError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "LeadAgentServiceUnavailableError";
  }
}

export class LeadAgentNotFoundError extends Error {
  constructor(public readonly jobId: string) {
    super(`Job not found: ${jobId}`);
    this.name = "LeadAgentNotFoundError";
  }
}

function getConfig() {
  const baseUrl =
    import.meta.env?.VITE_LEAD_AGENT_BASE_URL ??
    (typeof process !== "undefined" ? process.env.VITE_LEAD_AGENT_BASE_URL : undefined) ??
    "http://localhost:8000";
  const apiKey =
    import.meta.env?.VITE_LEAD_AGENT_API_KEY ??
    (typeof process !== "undefined" ? process.env.VITE_LEAD_AGENT_API_KEY : undefined);
  return {
    baseUrl: normalizeBaseUrl(String(baseUrl)),
    apiKey: apiKey ? String(apiKey) : null,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig();
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new LeadAgentServiceUnavailableError(401, "Lead Agent: invalid API key");
  }
  if (res.status === 404) {
    const id = path.split("/").pop() ?? path;
    throw new LeadAgentNotFoundError(id);
  }
  if (res.status >= 500) {
    let detail = `Lead Agent service error (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string };
      if (body.detail) detail = body.detail;
      else if (body.message) detail = body.message;
    } catch {
      // ignore
    }
    throw new LeadAgentServiceUnavailableError(res.status, detail);
  }
  if (!res.ok) {
    throw new LeadAgentServiceUnavailableError(
      res.status,
      `Lead Agent: unexpected status ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

export const leadAgentClient = {
  createJob(input: LeadAgentJobInput): Promise<LeadAgentCreateJobResult> {
    return apiFetch<LeadAgentCreateJobResult>("/enrich", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getJobStatus(jobId: string): Promise<LeadAgentJobStatus> {
    return apiFetch<LeadAgentJobStatus>(`/jobs/${jobId}`);
  },
};
