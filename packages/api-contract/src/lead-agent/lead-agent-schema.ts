import z from "zod";

// ── Job (Run) ──────────────────────────────────────────────────────

export const jobMetricsSchema = z.object({
  companies_found: z.number().nullish(),
  leads_found: z.number().nullish(),
  leads_qualified: z.number().nullish(),
  avg_score: z.number().nullish(),
});

export const jobSummarySchema = z.object({
  id: z.string(),
  job_name: z.string().nullable(),
  status: z.string(),
  icp: z.record(z.unknown()),
  progress: z.number().nullable(),
  current_funnel_stage: z.string().nullable(),
  metrics: jobMetricsSchema.nullable(),
  started_at: z.coerce.date(),
  finished_at: z.coerce.date().nullable(),
});

export const listLeadAgentJobsResponseSchema = z.object({
  jobs: z.array(jobSummarySchema),
  total: z.number(),
});

// ── Company ────────────────────────────────────────────────────────

export const leadCompanySchema = z.object({
  id: z.number(),
  job_id: z.string(),
  name: z.string().nullable(),
  domain: z.string().nullable(),
  website: z.string().nullable(),
  sector: z.string().nullable(),
  icp_fit_score: z.number().nullable(),
  disqualified: z.boolean(),
  linkedin_url: z.string().nullable(),
  instagram: z.string().nullable(),
  facebook: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip_code: z.string().nullable(),
  domain_age_days: z.number().nullable(),
  technologies: z.array(z.string()),
  source: z.string().nullable(),
  enriched_at: z.coerce.date().nullable(),
});

export const listJobCompaniesResponseSchema = z.object({
  companies: z.array(leadCompanySchema),
  total: z.number(),
});

// ── Lead ───────────────────────────────────────────────────────────

export const bantSchema = z.object({
  budget: z.string().nullish(),
  authority: z.string().nullish(),
  need: z.string().nullish(),
  timeline: z.string().nullish(),
});

export const agentLeadSchema = z.object({
  id: z.number(),
  job_id: z.string(),
  company_id: z.number().nullable(),
  company_name: z.string().nullable(),
  full_name: z.string().nullable(),
  role: z.string().nullable(),
  email: z.string().nullable(),
  email_confidence: z.number().nullable(),
  email_verified: z.boolean().nullable(),
  phone: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  instagram: z.string().nullable(),
  outreach_status: z.string(),
  outreach_angle: z.string().nullable(),
  score: z.number().nullable(),
  score_reason: z.string().nullable(),
  bant: bantSchema.nullable(),
  red_flags: z.array(z.string()),
  email_subject: z.string().nullable(),
  email_body: z.string().nullable(),
  follow_up_1: z.string().nullable(),
  follow_up_2: z.string().nullable(),
  hubspot_contact_id: z.string().nullable(),
  discovered_at: z.coerce.date().nullable(),
});

export const listLeadAgentLeadsQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
  search: z.string().optional(),
});

export const listLeadAgentLeadsResponseSchema = z.object({
  leads: z.array(agentLeadSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const updateLeadStatusBodySchema = z.object({
  status: z.string(),
});

// ── Path params ────────────────────────────────────────────────────

export const leadAgentJobIdPathSchema = z.object({
  jobId: z.string(),
});

export const leadAgentLeadIdPathSchema = z.object({
  jobId: z.string(),
  leadId: z.coerce.number(),
});

export const leadAgentCompanyIdPathSchema = z.object({
  jobId: z.string(),
  companyId: z.coerce.number(),
});

// ── Create job ────────────────────────────────────────────────────

export const createJobBodySchema = z.object({
  industry: z.string().min(1),
  geo: z.string().min(1),
  produto: z.string().min(1),
  target_titles: z.array(z.string()).default([]),
  company_size: z.string().optional(),
  max_leads: z.number().int().min(1).max(200).optional(),
  min_score: z.number().min(0).max(10).optional(),
  max_companies: z.number().int().min(1).optional(),
});

export const createJobResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  message: z.string(),
});

// ── Job status (live, proxied from Lead Agent service) ─────────────

export const jobLiveStatusSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  progress: z.number().nullable(),
  current_funnel_stage: z.string().nullable(),
  stage_counts: z.record(z.number()).nullable(),
  leads: z.array(z.unknown()).optional(),
  total_leads: z.number().nullable(),
  next_cursor: z.string().nullable().optional(),
  drop_reasons_top: z.union([z.array(z.unknown()), z.record(z.number())]).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ── Import ─────────────────────────────────────────────────────────

export const importLeadsToListRequestSchema = z.object({
  listId: z.string().min(1),
  leadIds: z.array(z.number()).min(1, "At least one lead required"),
});

export const importLeadsToListResponseSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  errors: z.number(),
});
