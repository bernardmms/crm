import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockLeadAgentHttp } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    enrichmentJob: {
      upsert: vi.fn(),
    },
    contactList: {
      findFirst: vi.fn(),
    },
    agentLead: {
      findMany: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    agentLeadContact: {
      upsert: vi.fn(),
    },
    contactListEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  mockLeadAgentHttp: {
    createJob: vi.fn(),
    getJobStatus: vi.fn(),
  },
}));

vi.mock('../../lib/db', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../lib/lead-agent-http', () => ({
  leadAgentHttp: mockLeadAgentHttp,
  LeadAgentNotFoundError: class LeadAgentNotFoundError extends Error {},
  LeadAgentServiceUnavailableError: class LeadAgentServiceUnavailableError extends Error {},
}));

import { LeadAgentService } from '../lead-agent.service';

describe('LeadAgentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$queryRaw.mockResolvedValue([
      { column_name: 'jobName' },
      { column_name: 'icpJson' },
    ]);
  });

  it('creates a job in the agent service and persists the unified job row', async () => {
    mockLeadAgentHttp.createJob.mockResolvedValueOnce({
      job_id: 'job-1',
      status: 'queued',
      message: 'Job queued',
    });

    const service = new LeadAgentService();
    const response = await service.createJob({
      industry: 'solar',
      geo: 'Sao Paulo',
      produto: 'CRM',
      target_titles: ['CEO'],
      max_companies: 25,
    });

    expect(response.status).toBe(200);
    expect(mockLeadAgentHttp.createJob).toHaveBeenCalledTimes(1);
    expect(mockPrisma.enrichmentJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        create: expect.objectContaining({
          id: 'job-1',
          jobName: 'solar · Sao Paulo · CRM',
          status: 'queued',
          icpJson: expect.objectContaining({
            industry: 'solar',
            geo: 'Sao Paulo',
            produto: 'CRM',
          }),
        }),
      }),
    );
  });

  it('syncs live status into the unified database', async () => {
    mockLeadAgentHttp.getJobStatus.mockResolvedValueOnce({
      job_id: 'job-9',
      status: 'running',
      progress: 0.45,
      current_funnel_stage: 'searching',
      stage_counts: { searching: 12 },
      total_leads: 5,
      drop_reasons_top: { no_email: 2 },
      created_at: '2026-04-28T12:00:00.000Z',
      updated_at: '2026-04-28T12:05:00.000Z',
    });

    const service = new LeadAgentService();
    const response = await service.getJobLiveStatus('job-9');

    expect(response.status).toBe(200);
    expect(mockPrisma.enrichmentJob.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-9' },
        update: expect.objectContaining({
          status: 'running',
          progress: 0.45,
          currentFunnelStage: 'searching',
          stageCounts: { searching: 12 },
        }),
      }),
    );
  });

  it('links one lead to multiple contacts and one contact to multiple leads without duplicating list entries', async () => {
    mockPrisma.contactList.findFirst.mockResolvedValueOnce({ id: 'list-1' });
    mockPrisma.agentLead.findMany.mockResolvedValueOnce([
      {
        id: 1,
        jobId: 'job-1',
        fullName: 'Ana Silva',
        email: 'ana@example.com',
        phone: '1111',
        role: 'CEO',
        linkedinUrl: 'https://linkedin.com/in/ana',
        company: { name: 'Acme' },
      },
      {
        id: 2,
        jobId: 'job-1',
        fullName: 'Ana Silva',
        email: 'ana@example.com',
        phone: null,
        role: 'CEO',
        linkedinUrl: null,
        company: { name: 'Acme' },
      },
    ]);
    mockPrisma.contact.findMany
      .mockResolvedValueOnce([
        {
          id: 'contact-1',
          email: 'ana@example.com',
          phone: null,
          notes: null,
        },
        {
          id: 'contact-2',
          email: null,
          phone: '1111',
          notes: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'contact-1',
          email: 'ana@example.com',
          phone: null,
          notes: null,
        },
      ]);
    mockPrisma.contactListEntry.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-entry' });

    const service = new LeadAgentService();
    const response = await service.importLeads(
      'user-1',
      null,
      'list-1',
      [1, 2],
    );

    expect(response).toEqual({
      status: 200,
      body: {
        imported: 2,
        skipped: 1,
        errors: 0,
      },
    });
    expect(mockPrisma.agentLeadContact.upsert).toHaveBeenCalledTimes(3);
    expect(mockPrisma.contactListEntry.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.agentLeadContact.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({
          jobId: 'job-1',
          agentLeadId: 1,
          contactId: 'contact-1',
          matchedBy: ['email'],
        }),
      }),
    );
    expect(mockPrisma.agentLeadContact.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({
          jobId: 'job-1',
          agentLeadId: 1,
          contactId: 'contact-2',
          matchedBy: ['phone'],
        }),
      }),
    );
    expect(mockPrisma.agentLeadContact.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        create: expect.objectContaining({
          jobId: 'job-1',
          agentLeadId: 2,
          contactId: 'contact-1',
          matchedBy: ['email'],
        }),
      }),
    );
  });
});
