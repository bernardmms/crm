import { Injectable, Logger } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Prisma, type Contact } from '@prisma/client';
import { ServerInferResponses } from '@ts-rest/core';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db';
import type { OrgContext } from '../lib/org-context';
import {
  leadAgentHttp,
  LeadAgentNotFoundError,
  LeadAgentServiceUnavailableError,
} from '../lib/lead-agent-http';

let enrichmentJobSnapshotColumnsPromise: Promise<boolean> | null = null;
const DEFAULT_ICP_PAYLOAD = {
  industry: '',
  geo: '',
  produto: '',
  target_titles: [] as string[],
  company_size: '10-100 funcionários',
  max_leads: 20,
  min_score: 5,
  max_companies: 30,
};

function parseIcp(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseLegacyIcpDescription(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  const text = raw.trim();
  if (!text || text.startsWith('{')) return {};

  const targetTitlesMatch = text.match(/Cargos alvo:\s*(.+?)(?:\.|$)/i);
  const companySizeMatch = text.match(/com tamanho\s+(.+?),\s*que precisam/i);
  const produtoMatch = text.match(/que precisam de\s+(.+?)(?:\.|$)/i);
  const headMatch = text.match(/^(.*?)(?:\s+em\s+)([^,\.]+)(?:,|\.|$)/i);

  const result: Record<string, unknown> = {};

  if (headMatch) {
    const industry = headMatch[1]?.trim();
    const geo = headMatch[2]?.trim();
    if (industry) result.industry = industry;
    if (geo) result.geo = geo;
  }

  const companySize = companySizeMatch?.[1]?.trim();
  if (companySize) result.company_size = companySize;

  const produto = produtoMatch?.[1]?.trim();
  if (produto) result.produto = produto;

  const targetTitles = targetTitlesMatch?.[1]
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (targetTitles && targetTitles.length > 0) {
    result.target_titles = targetTitles;
  }

  return result;
}

function parseIcpSnapshot(raw: unknown, fallbackRaw?: string | null): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  const parsed = parseIcp(fallbackRaw);
  if (Object.keys(parsed).length > 0) return parsed;
  return parseLegacyIcpDescription(fallbackRaw);
}

function normalizeIcpPayload(input: Record<string, unknown>): Record<string, unknown> {
  return {
    industry: typeof input.industry === 'string' ? input.industry : DEFAULT_ICP_PAYLOAD.industry,
    geo: typeof input.geo === 'string' ? input.geo : DEFAULT_ICP_PAYLOAD.geo,
    produto: typeof input.produto === 'string' ? input.produto : DEFAULT_ICP_PAYLOAD.produto,
    target_titles: Array.isArray(input.target_titles)
      ? input.target_titles.map((value) => String(value)).filter(Boolean)
      : DEFAULT_ICP_PAYLOAD.target_titles,
    company_size:
      typeof input.company_size === 'string'
        ? input.company_size
        : DEFAULT_ICP_PAYLOAD.company_size,
    max_leads:
      typeof input.max_leads === 'number' ? input.max_leads : DEFAULT_ICP_PAYLOAD.max_leads,
    min_score:
      typeof input.min_score === 'number' ? input.min_score : DEFAULT_ICP_PAYLOAD.min_score,
    max_companies:
      typeof input.max_companies === 'number'
        ? input.max_companies
        : DEFAULT_ICP_PAYLOAD.max_companies,
  };
}

function buildJobName(icp: {
  industry: string;
  geo: string;
  produto: string;
}): string {
  return [icp.industry, icp.geo, icp.produto].filter(Boolean).join(' · ');
}

function deriveJobName(job: {
  jobName: string | null;
  icpRaw: string | null;
  icpJson: Prisma.JsonValue | null;
}): string | null {
  if (job.jobName?.trim()) return job.jobName.trim();

  const snapshot =
    job.icpJson && typeof job.icpJson === 'object' && !Array.isArray(job.icpJson)
      ? (job.icpJson as Record<string, unknown>)
      : null;
  const fromSnapshot =
    snapshot &&
    [snapshot.industry, snapshot.geo, snapshot.produto]
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => String(value).trim())
      .join(' · ');
  if (fromSnapshot) return fromSnapshot;

  const parsedIcp = parseIcp(job.icpRaw);
  const legacyIcp =
    Object.keys(parsedIcp).length > 0 ? parsedIcp : parseLegacyIcpDescription(job.icpRaw);
  const fromParsed =
    [legacyIcp.industry, legacyIcp.geo, legacyIcp.produto]
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => String(value).trim())
      .join(' · ');
  if (fromParsed) return fromParsed;

  if (job.icpRaw?.trim() && !job.icpRaw.trim().startsWith('{')) {
    return job.icpRaw.trim();
  }

  return null;
}

function parseMetrics(
  metricsJson: unknown,
  stageCounts: unknown,
): {
  companies_found?: number | null;
  leads_found?: number | null;
  leads_qualified?: number | null;
  avg_score?: number | null;
} | null {
  const src =
    (metricsJson as Record<string, unknown>) ??
    (stageCounts as Record<string, unknown>) ??
    null;
  if (!src) return null;
  return {
    companies_found: (src.companies_found as number) ?? null,
    leads_found: (src.leads_found as number) ?? null,
    leads_qualified: (src.leads_qualified as number) ?? null,
    avg_score: (src.avg_score as number) ?? null,
  };
}

function parseMinScore(raw: string | null | undefined): number | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { min_score?: unknown };
    return typeof parsed.min_score === 'number' ? parsed.min_score : null;
  } catch {
    return null;
  }
}

function normalizeComparable(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function splitFullName(fullName: string | null | undefined) {
  const [firstName, ...rest] = (fullName ?? 'Unknown').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: firstName || 'Unknown',
    lastName: rest.length > 0 ? rest.join(' ') : null,
  };
}

function inferContactMatchKeys(
  lead: {
    email: string | null;
    phone: string | null;
  },
  contact: {
    email: string | null;
    phone: string | null;
    notes: string | null;
  },
): string[] {
  const matches = new Set<string>();
  const leadEmail = normalizeComparable(lead.email);
  const leadPhone = normalizeComparable(lead.phone);

  if (leadEmail && leadEmail === normalizeComparable(contact.email)) {
    matches.add('email');
  }

  if (leadPhone && leadPhone === normalizeComparable(contact.phone)) {
    matches.add('phone');
  }

  if (
    leadEmail &&
    contact.notes?.toLowerCase().includes(`email:${leadEmail}`)
  ) {
    matches.add('email');
  }

  return [...matches];
}

async function syncJobRecord(input: {
  jobId: string;
  jobName?: string | null;
  status: string;
  icpJson?: Prisma.InputJsonValue | null | undefined;
  icpRaw?: string | null;
  progress?: number | null;
  currentFunnelStage?: string | null;
  stageCounts?: Prisma.InputJsonValue | null | undefined;
  metricsJson?: Prisma.InputJsonValue | null | undefined;
  finishedAt?: Date | null;
}) {
  const hasSnapshotColumns = await hasEnrichmentJobSnapshotColumns();

  await (prisma.enrichmentJob as any).upsert({
    where: { id: input.jobId },
    create: {
      id: input.jobId,
      status: input.status,
      icpRaw: input.icpRaw ?? null,
      progress: input.progress ?? null,
      currentFunnelStage: input.currentFunnelStage ?? null,
      stageCounts: input.stageCounts ?? Prisma.JsonNull,
      metricsJson: input.metricsJson ?? Prisma.JsonNull,
      finishedAt: input.finishedAt ?? null,
      ...(hasSnapshotColumns
        ? {
            jobName: input.jobName ?? null,
            icpJson: input.icpJson ?? Prisma.JsonNull,
          }
        : {}),
    },
    update: {
      status: input.status,
      icpRaw: input.icpRaw ?? undefined,
      progress: input.progress ?? null,
      currentFunnelStage: input.currentFunnelStage ?? null,
      stageCounts:
        input.stageCounts === undefined
          ? undefined
          : input.stageCounts ?? Prisma.JsonNull,
      metricsJson:
        input.metricsJson === undefined
          ? undefined
          : input.metricsJson ?? Prisma.JsonNull,
      finishedAt: input.finishedAt ?? null,
      ...(hasSnapshotColumns
        ? {
            jobName: input.jobName ?? undefined,
            icpJson:
              input.icpJson === undefined
                ? undefined
                : input.icpJson ?? Prisma.JsonNull,
          }
        : {}),
    },
  });
}

type EnrichmentJobSnapshotRow = {
  id: string;
  jobName: string | null;
  status: string;
  progress: number | null;
  icpJson: Prisma.JsonValue | null;
  icpRaw: string | null;
  error: string | null;
  currentFunnelStage: string | null;
  stageCounts: Prisma.JsonValue | null;
  metricsJson: Prisma.JsonValue | null;
  createdAt: Date;
  finishedAt: Date | null;
  updatedAt: Date;
};

async function hasEnrichmentJobSnapshotColumns() {
  if (!enrichmentJobSnapshotColumnsPromise) {
    enrichmentJobSnapshotColumnsPromise = prisma
      .$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'we-crm'
          AND table_name = 'enrichment_job'
          AND column_name IN ('jobName', 'icpJson')
      `
      .then((rows) => {
        const names = new Set(rows.map((row) => row.column_name));
        return names.has('jobName') && names.has('icpJson');
      })
      .catch(() => false);
  }

  return enrichmentJobSnapshotColumnsPromise;
}

async function findEnrichmentJobs(): Promise<EnrichmentJobSnapshotRow[]> {
  const hasSnapshotColumns = await hasEnrichmentJobSnapshotColumns();

  return (prisma.enrichmentJob.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      progress: true,
      icpRaw: true,
      error: true,
      currentFunnelStage: true,
      stageCounts: true,
      metricsJson: true,
      createdAt: true,
      finishedAt: true,
      updatedAt: true,
      ...(hasSnapshotColumns
        ? {
            jobName: true,
            icpJson: true,
          }
        : {}),
    },
  }) as Promise<EnrichmentJobSnapshotRow[]>);
}

async function findEnrichmentJob(jobId: string): Promise<EnrichmentJobSnapshotRow | null> {
  const hasSnapshotColumns = await hasEnrichmentJobSnapshotColumns();

  return (prisma.enrichmentJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      progress: true,
      icpRaw: true,
      error: true,
      currentFunnelStage: true,
      stageCounts: true,
      metricsJson: true,
      createdAt: true,
      finishedAt: true,
      updatedAt: true,
      ...(hasSnapshotColumns
        ? {
            jobName: true,
            icpJson: true,
          }
        : {}),
    },
  }) as Promise<EnrichmentJobSnapshotRow | null>);
}

async function buildJobMetrics(
  jobId: string,
  icpRaw: string | null | undefined,
  icpJson?: unknown,
) {
  const snapshot =
    icpJson && typeof icpJson === 'object' && !Array.isArray(icpJson)
      ? (icpJson as Record<string, unknown>)
      : null;
  const minScore =
    typeof snapshot?.min_score === 'number'
      ? snapshot.min_score
      : parseMinScore(icpRaw);
  const [companiesFound, leadsAggregate] = await Promise.all([
    prisma.leadCompany.count({ where: { jobId } }),
    prisma.agentLead.aggregate({
      where: { jobId },
      _count: { id: true },
      _avg: { score: true },
    }),
  ]);

  const qualifiedWhere: Prisma.AgentLeadWhereInput =
    minScore == null
      ? { jobId, score: { not: null } }
      : { jobId, score: { gte: minScore } };

  const leadsQualified = await prisma.agentLead.count({
    where: qualifiedWhere,
  });

  return {
    companies_found: companiesFound,
    leads_found: leadsAggregate._count.id,
    leads_qualified: leadsQualified,
    avg_score: leadsAggregate._avg.score ?? null,
  };
}

type AgentLeadWithCompany = Awaited<
  ReturnType<typeof prisma.agentLead.findFirstOrThrow>
> & { company?: { name: string | null } | null };

function mapLead(l: AgentLeadWithCompany) {
  return {
    id: l.id,
    job_id: l.jobId,
    company_id: l.companyId ?? null,
    company_name: l.company?.name ?? null,
    full_name: l.fullName ?? null,
    role: l.role ?? null,
    email: l.email ?? null,
    email_confidence: l.emailConfidence ?? null,
    email_verified: l.emailVerified ?? null,
    phone: l.phone ?? null,
    linkedin_url: l.linkedinUrl ?? null,
    instagram: l.instagram ?? null,
    outreach_status: l.outreachStatus,
    outreach_angle: l.outreachAngle ?? null,
    score: l.score ?? null,
    score_reason: l.scoreReason ?? null,
    bant: l.bantJson
      ? (l.bantJson as {
          budget?: string | null;
          authority?: string | null;
          need?: string | null;
          timeline?: string | null;
        })
      : null,
    red_flags: l.redFlags,
    email_subject: l.emailSubject ?? null,
    email_body: l.emailBody ?? null,
    follow_up_1: l.followUp1 ?? null,
    follow_up_2: l.followUp2 ?? null,
    hubspot_contact_id: l.hubspotContactId ?? null,
    discovered_at: l.discoveredAt ?? null,
  };
}

type LeadCompanyRow = Awaited<
  ReturnType<typeof prisma.leadCompany.findFirstOrThrow>
>;

function mapCompany(c: LeadCompanyRow) {
  return {
    id: c.id,
    job_id: c.jobId,
    name: c.name ?? null,
    domain: c.domain ?? null,
    website: c.website ?? null,
    sector: c.sector ?? null,
    icp_fit_score: c.icpFitScore ?? null,
    disqualified: c.disqualified,
    linkedin_url: c.linkedinUrl ?? null,
    instagram: c.instagram ?? null,
    facebook: c.facebook ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
    zip_code: c.zipCode ?? null,
    domain_age_days: c.domainAgeDays ?? null,
    technologies: c.technologies,
    source: c.source ?? null,
    enriched_at: c.enrichedAt ?? null,
  };
}

@Injectable()
export class LeadAgentService {
  private readonly logger = new Logger(LeadAgentService.name);

  async createJob(body: {
    industry: string;
    geo: string;
    produto: string;
    target_titles: string[];
    company_size?: string;
    max_leads?: number;
    min_score?: number;
    max_companies?: number;
  }): Promise<ServerInferResponses<typeof contract.leadAgentContract.createJob>> {
    try {
      const result = await leadAgentHttp.createJob({
        industry: body.industry,
        geo: body.geo,
        produto: body.produto,
        target_titles: body.target_titles,
        company_size: body.company_size,
        max_leads: body.max_leads,
        min_score: body.min_score,
        max_companies: body.max_companies,
      });
      const normalizedIcp = normalizeIcpPayload(body as Record<string, unknown>);
      await syncJobRecord({
        jobId: result.job_id,
        jobName: buildJobName(normalizedIcp as { industry: string; geo: string; produto: string }),
        status: result.status,
        icpJson: normalizedIcp as Prisma.InputJsonValue,
        icpRaw: JSON.stringify(normalizedIcp),
      });
      this.logger.log(`Job created: ${result.job_id}`);
      return { status: 200 as const, body: result };
    } catch (err) {
      if (err instanceof LeadAgentServiceUnavailableError) {
        this.logger.error(`Lead Agent unavailable: ${err.message}`);
        return { status: 503 as const, body: { message: err.message } };
      }
      throw err;
    }
  }

  async getJobLiveStatus(
    jobId: string,
  ): Promise<ServerInferResponses<typeof contract.leadAgentContract.getJobLiveStatus>> {
    try {
      const status = await leadAgentHttp.getJobStatus(jobId);
      await syncJobRecord({
        jobId: status.job_id,
        status: status.status,
        progress: status.progress ?? null,
        currentFunnelStage: status.current_funnel_stage ?? null,
        stageCounts: (status.stage_counts as Prisma.InputJsonValue | null) ?? null,
        finishedAt: ['completed', 'failed', 'cancelled'].includes(status.status)
          ? new Date(status.updated_at)
          : null,
      });
      this.logger.debug(`Polled job ${jobId}: ${status.status}`);
      return {
        status: 200 as const,
        body: {
          job_id: status.job_id,
          status: status.status,
          progress: status.progress ?? null,
          current_funnel_stage: status.current_funnel_stage ?? null,
          stage_counts: status.stage_counts ?? null,
          leads: status.leads,
          total_leads: status.total_leads ?? null,
          next_cursor: status.next_cursor ?? null,
          drop_reasons_top: status.drop_reasons_top ?? null,
          created_at: status.created_at,
          updated_at: status.updated_at,
        },
      };
    } catch (err) {
      if (err instanceof LeadAgentNotFoundError) {
        return { status: 404 as const, body: { message: `Job not found: ${jobId}` } };
      }
      if (err instanceof LeadAgentServiceUnavailableError) {
        this.logger.error(`Lead Agent unavailable polling ${jobId}: ${err.message}`);
        return { status: 503 as const, body: { message: err.message } };
      }
      throw err;
    }
  }


  async listJobs(): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.listJobs>
  > {
    const jobs = await findEnrichmentJobs();

    const rows = await Promise.all(
      jobs.map(async (j) => ({
        id: j.id,
        job_name: deriveJobName(j),
        status: j.status,
        icp: normalizeIcpPayload(parseIcpSnapshot(j.icpJson, j.icpRaw)),
        progress: j.progress ?? null,
        current_funnel_stage: j.currentFunnelStage ?? null,
        metrics:
          parseMetrics(j.metricsJson, j.stageCounts) ??
          (await buildJobMetrics(j.id, j.icpRaw, j.icpJson)),
        started_at: j.createdAt,
        finished_at: j.finishedAt ?? null,
      })),
    );

    return { status: 200 as const, body: { jobs: rows, total: rows.length } };
  }

  async getJob(
    jobId: string,
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.getJob>
  > {
    const j = await findEnrichmentJob(jobId);
    if (!j) return { status: 404 as const, body: { message: 'Job not found' } };

    return {
      status: 200 as const,
      body: {
        id: j.id,
        job_name: deriveJobName(j),
        status: j.status,
        icp: normalizeIcpPayload(parseIcpSnapshot(j.icpJson, j.icpRaw)),
        progress: j.progress ?? null,
        current_funnel_stage: j.currentFunnelStage ?? null,
        metrics:
          parseMetrics(j.metricsJson, j.stageCounts) ??
          (await buildJobMetrics(j.id, j.icpRaw, j.icpJson)),
        started_at: j.createdAt,
        finished_at: j.finishedAt ?? null,
      },
    };
  }

  async deleteJob(
    jobId: string,
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.deleteJob>
  > {
    const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
    if (!job) return { status: 404 as const, body: { message: 'Job not found' } };
    await prisma.enrichmentJob.delete({ where: { id: jobId } });
    return { status: 200 as const, body: { success: true } };
  }

  async listJobCompanies(
    jobId: string,
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.listJobCompanies>
  > {
    const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
    if (!job) return { status: 404 as const, body: { message: 'Job not found' } };

    const companies = await prisma.leadCompany.findMany({
      where: { jobId },
      orderBy: { id: 'asc' },
    });

    return {
      status: 200 as const,
      body: {
        companies: companies.map(mapCompany),
        total: companies.length,
      },
    };
  }

  async deleteCompany(
    jobId: string,
    companyId: number,
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.deleteCompany>
  > {
    const company = await prisma.leadCompany.findFirst({
      where: { id: companyId, jobId },
    });
    if (!company) {
      return { status: 404 as const, body: { message: 'Company not found' } };
    }

    await prisma.$transaction(async (tx) => {
      await tx.agentLead.deleteMany({
        where: { jobId, companyId },
      });
      await tx.leadCompany.delete({
        where: { id: companyId },
      });
    });

    return { status: 200 as const, body: { success: true } };
  }

  async listLeads(
    jobId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.listLeads>
  > {
    const job = await prisma.enrichmentJob.findUnique({ where: { id: jobId } });
    if (!job) return { status: 404 as const, body: { message: 'Job not found' } };

    const offset = (page - 1) * limit;
    const where = search
      ? {
          jobId,
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { role: { contains: search, mode: 'insensitive' as const } },
            {
              company: {
                name: { contains: search, mode: 'insensitive' as const },
              },
            },
          ],
        }
      : { jobId };

    const [leads, total] = await Promise.all([
      prisma.agentLead.findMany({
        where,
        include: { company: { select: { name: true } } },
        orderBy: { id: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.agentLead.count({ where }),
    ]);

    return {
      status: 200 as const,
      body: {
        leads: leads.map(mapLead),
        total,
        page,
        limit,
      },
    };
  }

  async updateLeadStatus(
    jobId: string,
    leadId: number,
    status: string,
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.updateLeadStatus>
  > {
    const lead = await prisma.agentLead.findFirst({
      where: { id: leadId, jobId },
      include: { company: { select: { name: true } } },
    });
    if (!lead) return { status: 404 as const, body: { message: 'Lead not found' } };

    const updated = await prisma.agentLead.update({
      where: { id: leadId },
      data: { outreachStatus: status },
      include: { company: { select: { name: true } } },
    });

    return {
      status: 200 as const,
      body: mapLead(updated),
    };
  }

  async deleteLead(
    jobId: string,
    leadId: number,
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.deleteLead>
  > {
    const lead = await prisma.agentLead.findFirst({ where: { id: leadId, jobId } });
    if (!lead) return { status: 404 as const, body: { message: 'Lead not found' } };
    await prisma.agentLead.deleteMany({ where: { id: leadId, jobId } });
    return { status: 200 as const, body: { success: true } };
  }

  async importLeads(
    userId: string,
    orgContext: OrgContext | null,
    listId: string,
    leadIds: number[],
  ): Promise<
    ServerInferResponses<typeof contract.leadAgentContract.importLeads>
  > {
    const whereClause = orgContext
      ? { id: listId, organizationId: orgContext.orgId }
      : { id: listId, userId, organizationId: null };

    const list = await prisma.contactList.findFirst({ where: whereClause });
    if (!list) {
      return { status: 404 as const, body: { message: 'Contact list not found' } };
    }

    const leads = await prisma.agentLead.findMany({
      where: { id: { in: leadIds } },
      include: { company: { select: { name: true } } },
    });

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const lead of leads) {
      try {
        const contacts = await this.resolveContactsForLead(userId, orgContext, lead);
        let addedForLead = 0;
        let skippedForLead = 0;

        for (const contact of contacts) {
          const matchKeys = inferContactMatchKeys(lead, contact);
          await prisma.agentLeadContact.upsert({
            where: {
              agentLeadId_contactId: {
                agentLeadId: lead.id,
                contactId: contact.id,
              },
            },
            create: {
              jobId: lead.jobId,
              agentLeadId: lead.id,
              contactId: contact.id,
              matchedBy: matchKeys,
            },
            update: {
              matchedBy: matchKeys,
            },
          });

          const existing = await prisma.contactListEntry.findFirst({
            where: { contactListId: listId, contactId: contact.id },
          });

          if (existing) {
            skippedForLead++;
            continue;
          }

          await prisma.contactListEntry.create({
            data: {
              id: randomUUID(),
              contactListId: listId,
              contactId: contact.id,
            },
          });
          addedForLead++;
        }

        imported += addedForLead;
        skipped += skippedForLead;
      } catch {
        errors++;
      }
    }

    return { status: 200 as const, body: { imported, skipped, errors } };
  }

  private async resolveContactsForLead(
    userId: string,
    orgContext: OrgContext | null,
    lead: {
      fullName: string | null;
      email: string | null;
      phone: string | null;
      role: string | null;
      linkedinUrl: string | null;
      company: { name: string | null } | null;
    },
  ): Promise<Contact[]> {
    const scope = orgContext
      ? { organizationId: orgContext.orgId }
      : { userId, organizationId: null };

    const orFilters: Prisma.ContactWhereInput[] = [];
    if (lead.email) {
      orFilters.push({ email: lead.email });
    }
    if (lead.phone) {
      orFilters.push({ phone: lead.phone });
    }

    const matchedContacts = orFilters.length > 0
      ? await prisma.contact.findMany({
          where: {
            ...scope,
            OR: orFilters,
          },
        })
      : [];

    if (matchedContacts.length > 0) {
      return matchedContacts;
    }

    const { firstName, lastName } = splitFullName(lead.fullName);
    const notes = lead.linkedinUrl ? `LinkedIn: ${lead.linkedinUrl}` : null;

    return [
      await prisma.contact.create({
        data: {
          id: randomUUID(),
          firstName,
          lastName,
          email: lead.email ?? null,
          phone: lead.phone ?? null,
          jobTitle: lead.role ?? null,
          company: lead.company?.name ?? null,
          notes,
          userId,
          organizationId: orgContext?.orgId ?? null,
        },
      }),
    ];
  }
}
