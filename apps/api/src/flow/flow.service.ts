import { Injectable, Logger } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { ServerInferResponses } from '@ts-rest/core';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db';
import type { OrgContext } from '../lib/org-context';
import { EmailService } from '../email/email.service';
import {
  ProspectingService,
  type LeadItem,
  type RunCreatePayload,
} from '../prospecting/prospecting.service';

import type { Prisma } from '@prisma/client';

type AiAgentParams = RunCreatePayload;

type ListSourceConfigShape = {
  mode?: 'LIST' | 'AI_AGENT';
  contactListId?: string;
  contactListName?: string;
  agentParams?: AiAgentParams;
  aiAgentRunId?: string;
  aiAgentRunStatus?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  runIndex?: number;
  failureReason?: string;
};

type FlowNode = {
  id: string;
  type: string;
  config: Prisma.JsonValue;
  posX: number;
  posY: number;
};

type SaveNode = { id: string; type: string; config: Record<string, unknown>; posX: number; posY: number };
type SaveEdge = { id: string; sourceNodeId: string; targetNodeId: string };

@Injectable()
export class FlowService {
  private readonly logger = new Logger(FlowService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prospectingService: ProspectingService,
  ) {}

  private whereClause(userId: string, orgContext: OrgContext | null) {
    if (orgContext) return { organizationId: orgContext.orgId };
    return { userId, organizationId: null };
  }

  private async findFlowWithNodes(flowId: string) {
    return prisma.flow.findFirst({
      where: { id: flowId },
      include: {
        nodes: true,
        edges: true,
        _count: { select: { enrollments: true } },
      },
    });
  }

  async listFlows(
    userId: string,
    orgContext: OrgContext | null,
  ): Promise<ServerInferResponses<typeof contract.flowContract.listFlows>> {
    const flows = await prisma.flow.findMany({
      where: this.whereClause(userId, orgContext),
      orderBy: { createdAt: 'desc' },
      include: {
        nodes: true,
        edges: true,
        _count: { select: { enrollments: true } },
      },
    });

    return {
      status: 200 as const,
      body: { flows: flows as never, total: flows.length },
    };
  }

  async getFlow(
    userId: string,
    flowId: string,
    orgContext: OrgContext | null,
  ): Promise<ServerInferResponses<typeof contract.flowContract.getFlow>> {
    const flow = await prisma.flow.findFirst({
      where: { id: flowId, ...this.whereClause(userId, orgContext) },
      include: {
        nodes: true,
        edges: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!flow) return { status: 404 as const, body: { message: 'Flow not found' } };
    return { status: 200 as const, body: flow as never };
  }

  async createFlow(
    userId: string,
    orgContext: OrgContext | null,
    body: { name: string },
  ): Promise<ServerInferResponses<typeof contract.flowContract.createFlow>> {
    const flowId = randomUUID();
    const sourceNodeId = randomUUID();

    const flow = await prisma.flow.create({
      data: {
        id: flowId,
        name: body.name,
        userId,
        organizationId: orgContext?.orgId ?? null,
        nodes: {
          create: {
            id: sourceNodeId,
            type: 'LIST_SOURCE',
            config: {},
            posX: 100,
            posY: 200,
          },
        },
      },
      include: {
        nodes: true,
        edges: true,
        _count: { select: { enrollments: true } },
      },
    });

    return { status: 201 as const, body: flow as never };
  }

  async saveFlowGraph(
    userId: string,
    flowId: string,
    orgContext: OrgContext | null,
    body: { name?: string; nodes: SaveNode[]; edges: SaveEdge[] },
  ): Promise<ServerInferResponses<typeof contract.flowContract.saveFlowGraph>> {
    const existing = await prisma.flow.findFirst({
      where: { id: flowId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) return { status: 404 as const, body: { message: 'Flow not found' } };

    if (existing.status !== 'DRAFT') {
      return {
        status: 400 as const,
        body: { message: 'Only DRAFT flows can be edited. Pause the flow first.' },
      };
    }

    const flow = await prisma.$transaction(async (tx) => {
      await tx.flowEdge.deleteMany({ where: { flowId } });
      await tx.flowNode.deleteMany({ where: { flowId } });

      return tx.flow.update({
        where: { id: flowId },
        data: {
          ...(body.name ? { name: body.name } : {}),
          nodes: {
            create: body.nodes.map((n) => ({
              id: n.id,
              type: n.type as never,
              config: n.config as never,
              posX: n.posX,
              posY: n.posY,
            })),
          },
          edges: {
            create: body.edges.map((e) => ({
              id: e.id,
              sourceNodeId: e.sourceNodeId,
              targetNodeId: e.targetNodeId,
            })),
          },
        },
        include: {
          nodes: true,
          edges: true,
          _count: { select: { enrollments: true } },
        },
      });
    });

    return { status: 200 as const, body: flow as never };
  }

  async deleteFlow(
    userId: string,
    flowId: string,
    orgContext: OrgContext | null,
  ): Promise<ServerInferResponses<typeof contract.flowContract.deleteFlow>> {
    const existing = await prisma.flow.findFirst({
      where: { id: flowId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) return { status: 404 as const, body: { message: 'Flow not found' } };

    await prisma.flow.delete({ where: { id: flowId } });
    return { status: 200 as const, body: { success: true } };
  }

  async activateFlow(
    userId: string,
    flowId: string,
    orgContext: OrgContext | null,
  ): Promise<ServerInferResponses<typeof contract.flowContract.activateFlow>> {
    const flow = await prisma.flow.findFirst({
      where: { id: flowId, ...this.whereClause(userId, orgContext) },
      include: { nodes: true, edges: true },
    });

    if (!flow) return { status: 404 as const, body: { message: 'Flow not found' } };
    if (flow.status === 'ACTIVE') {
      return { status: 400 as const, body: { message: 'Flow is already active' } };
    }

    const sourceNode = flow.nodes.find((n) => n.type === 'LIST_SOURCE');
    if (!sourceNode) {
      return { status: 400 as const, body: { message: 'Flow must have a LIST_SOURCE node' } };
    }

    const config = this.readListSourceConfig(sourceNode);
    const mode = config.mode ?? 'LIST';

    const hasNextNode = flow.edges.some((e) => e.sourceNodeId === sourceNode.id);
    if (!hasNextNode) {
      return {
        status: 400 as const,
        body: { message: 'Flow must have at least one step after the contact list' },
      };
    }

    if (mode === 'LIST') {
      if (!config.contactListId) {
        return {
          status: 400 as const,
          body: { message: 'LIST_SOURCE node must have a contact list configured' },
        };
      }

      await prisma.flow.update({ where: { id: flowId }, data: { status: 'ACTIVE' } });
      void this.enrollNewContacts(flowId);
    } else {
      // AI_AGENT mode
      const params = config.agentParams;
      if (!params || !params.industry || !params.geo || !params.produto) {
        return {
          status: 400 as const,
          body: {
            message:
              'AI Agent source requires industry, region (geo) and product to be filled',
          },
        };
      }

      // Count past AI runs on this flow's source node config for this flow's lifetime
      // by counting contact lists that follow the auto-generated naming convention.
      const pastRuns = await prisma.contactList.count({
        where: {
          ...this.whereClause(userId, orgContext),
          name: { startsWith: `${flow.name} - AI Run #` },
        },
      });
      const runIndex = pastRuns + 1;

      // Create the contact list up-front so the flow has a stable destination,
      // then trigger the prospecting run. The poller fills the list when leads arrive.
      const listName = `${flow.name} - AI Run #${runIndex}`;
      const contactListId = randomUUID();
      await prisma.contactList.create({
        data: {
          id: contactListId,
          name: listName,
          description: `Auto-generated for flow "${flow.name}" (AI Agent run #${runIndex})`,
          userId,
          organizationId: orgContext?.orgId ?? null,
        },
      });

      let runSummary;
      try {
        runSummary = await this.prospectingService.createRun(params);
      } catch (err) {
        // Roll back the contact list — the run never started.
        await prisma.contactList.delete({ where: { id: contactListId } }).catch(() => {});
        const message = err instanceof Error ? err.message : 'Failed to start AI agent run';
        this.logger.error(`AI Agent run launch failed for flow ${flowId}: ${message}`);
        return { status: 400 as const, body: { message } };
      }

      const updatedConfig: ListSourceConfigShape = {
        ...config,
        mode: 'AI_AGENT',
        agentParams: params,
        aiAgentRunId: runSummary.run_id,
        aiAgentRunStatus: runSummary.status,
        contactListId,
        contactListName: listName,
        runIndex,
      };

      await prisma.$transaction([
        prisma.flowNode.update({
          where: { id: sourceNode.id },
          data: { config: updatedConfig as never },
        }),
        prisma.flow.update({ where: { id: flowId }, data: { status: 'ACTIVE' } }),
      ]);
      // Don't enroll yet — the poller will enroll once the run completes and leads are imported.
    }

    const updated = await this.findFlowWithNodes(flowId);
    return { status: 200 as const, body: updated as never };
  }

  private readListSourceConfig(node: { config: Prisma.JsonValue }): ListSourceConfigShape {
    if (node.config && typeof node.config === 'object' && !Array.isArray(node.config)) {
      return node.config as ListSourceConfigShape;
    }
    return {};
  }

  async pauseFlow(
    userId: string,
    flowId: string,
    orgContext: OrgContext | null,
  ): Promise<ServerInferResponses<typeof contract.flowContract.pauseFlow>> {
    const existing = await prisma.flow.findFirst({
      where: { id: flowId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) return { status: 404 as const, body: { message: 'Flow not found' } };
    if (existing.status !== 'ACTIVE') {
      return { status: 400 as const, body: { message: 'Only active flows can be paused' } };
    }

    const flow = await prisma.flow.update({
      where: { id: flowId },
      data: { status: 'PAUSED' },
      include: { nodes: true, edges: true, _count: { select: { enrollments: true } } },
    });

    return { status: 200 as const, body: flow as never };
  }

  async getFlowStats(
    userId: string,
    flowId: string,
    orgContext: OrgContext | null,
  ): Promise<ServerInferResponses<typeof contract.flowContract.getFlowStats>> {
    const existing = await prisma.flow.findFirst({
      where: { id: flowId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) return { status: 404 as const, body: { message: 'Flow not found' } };

    const [total, active, completed, failed] = await Promise.all([
      prisma.flowEnrollment.count({ where: { flowId } }),
      prisma.flowEnrollment.count({ where: { flowId, status: 'ACTIVE' } }),
      prisma.flowEnrollment.count({ where: { flowId, status: 'COMPLETED' } }),
      prisma.flowEnrollment.count({ where: { flowId, status: 'FAILED' } }),
    ]);

    return { status: 200 as const, body: { total, active, completed, failed } };
  }

  // ── Scheduler methods ───────────────────────────────────────────────

  async enrollNewContacts(flowId: string) {
    const flow = await prisma.flow.findFirst({
      where: { id: flowId, status: 'ACTIVE' },
      include: { nodes: true, edges: true },
    });

    if (!flow) return;

    const sourceNode = flow.nodes.find((n) => n.type === 'LIST_SOURCE');
    if (!sourceNode) return;

    const config = (sourceNode.config && typeof sourceNode.config === 'object' && !Array.isArray(sourceNode.config))
      ? (sourceNode.config as Record<string, unknown>)
      : {};
    const contactListId = config.contactListId as string | undefined;
    if (!contactListId) return;

    const listEntries = await prisma.contactListEntry.findMany({
      where: { contactListId },
      select: { contactId: true },
    });

    const existingEnrollments = await prisma.flowEnrollment.findMany({
      where: { flowId },
      select: { contactId: true },
    });

    const enrolledIds = new Set(existingEnrollments.map((e) => e.contactId));
    const newContactIds = listEntries
      .map((e) => e.contactId)
      .filter((id) => !enrolledIds.has(id));

    if (newContactIds.length === 0) return;

    this.logger.log(`Enrolling ${newContactIds.length} new contacts in flow ${flowId}`);

    const enrollments = newContactIds.map((contactId) => ({
      id: randomUUID(),
      flowId,
      contactId,
      currentNodeId: sourceNode.id,
      status: 'ACTIVE' as const,
      nextActionAt: new Date(),
    }));

    await prisma.flowEnrollment.createMany({ data: enrollments, skipDuplicates: true });
  }

  async advanceActiveEnrollments() {
    const due = await prisma.flowEnrollment.findMany({
      where: {
        status: 'ACTIVE',
        nextActionAt: { lte: new Date() },
        flow: { status: 'ACTIVE' },
      },
      include: {
        flow: { include: { nodes: true, edges: true } },
        currentNode: true,
      },
      take: 100,
    });

    for (const enrollment of due) {
      await this.advanceEnrollment(enrollment);
    }
  }

  private async advanceEnrollment(enrollment: {
    id: string;
    flowId: string;
    contactId: string;
    currentNodeId: string | null;
    flow: { nodes: FlowNode[]; edges: { sourceNodeId: string; targetNodeId: string }[] };
  }) {
    const currentNode = enrollment.flow.nodes.find(
      (n) => n.id === enrollment.currentNodeId,
    );

    if (!currentNode) {
      await prisma.flowEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'FAILED' },
      });
      return;
    }

    // Execute current node action
    if (currentNode.type === 'SEND_EMAIL') {
      await this.executeEmailNode(enrollment.contactId, currentNode);
    }
    // LIST_SOURCE and WAIT nodes require no execution — just advance

    // Find next node
    const outEdge = enrollment.flow.edges.find(
      (e) => e.sourceNodeId === currentNode.id,
    );

    if (!outEdge) {
      await prisma.flowEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'COMPLETED', currentNodeId: null },
      });
      return;
    }

    const nextNode = enrollment.flow.nodes.find(
      (n) => n.id === outEdge.targetNodeId,
    );

    if (!nextNode) {
      await prisma.flowEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'FAILED' },
      });
      return;
    }

    const nextActionAt = this.computeNextActionAt(nextNode);

    await prisma.flowEnrollment.update({
      where: { id: enrollment.id },
      data: { currentNodeId: nextNode.id, nextActionAt },
    });
  }

  private asConfig(node: FlowNode): Record<string, unknown> {
    return (node.config && typeof node.config === 'object' && !Array.isArray(node.config))
      ? (node.config as Record<string, unknown>)
      : {};
  }

  private computeNextActionAt(node: FlowNode): Date {
    if (node.type === 'WAIT') {
      const config = this.asConfig(node);
      if (config.mode === 'until' && config.at) {
        return new Date(config.at as string);
      }
      if (config.mode === 'duration') {
        const value = Number(config.value ?? 1);
        const unit = config.unit as string;
        const ms =
          unit === 'minutes' ? value * 60_000
          : unit === 'hours' ? value * 3_600_000
          : value * 86_400_000;
        return new Date(Date.now() + ms);
      }
    }
    return new Date();
  }

  private async executeEmailNode(contactId: string, node: FlowNode) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { email: true, firstName: true },
    });

    if (!contact?.email) return;

    const config = this.asConfig(node);
    const subject = config.subject as string | undefined;
    const htmlContent = config.htmlContent as string | undefined;

    if (!subject || !htmlContent) return;

    const result = await this.emailService.sendEmail({
      to: contact.email,
      subject,
      htmlContent,
    });

    if (!result.success) {
      this.logger.warn(
        `Failed to send flow email to ${contact.email}: ${result.error}`,
      );
    }
  }

  // ── AI Agent run polling ────────────────────────────────────────────

  async pollPendingAiAgentRuns() {
    const flows = await prisma.flow.findMany({
      where: {
        status: 'ACTIVE',
        nodes: { some: { type: 'LIST_SOURCE' } },
      },
      include: { nodes: true },
    });

    for (const flow of flows) {
      const sourceNode = flow.nodes.find((n) => n.type === 'LIST_SOURCE');
      if (!sourceNode) continue;

      const config = this.readListSourceConfig(sourceNode);
      if (config.mode !== 'AI_AGENT') continue;
      if (!config.aiAgentRunId) continue;
      if (
        config.aiAgentRunStatus === 'completed' ||
        config.aiAgentRunStatus === 'failed' ||
        config.aiAgentRunStatus === 'cancelled'
      ) {
        continue;
      }

      try {
        await this.processAiAgentRun(flow.id, sourceNode.id, config);
      } catch (err) {
        this.logger.error(
          `Error polling AI run for flow ${flow.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  private async processAiAgentRun(
    flowId: string,
    sourceNodeId: string,
    config: ListSourceConfigShape,
  ) {
    if (!config.aiAgentRunId || !config.contactListId) return;

    const summary = await this.prospectingService.getRun(config.aiAgentRunId);

    if (summary.status === config.aiAgentRunStatus) {
      // No state change yet
      if (summary.status !== 'completed') return;
    }

    if (summary.status === 'failed' || summary.status === 'cancelled') {
      this.logger.warn(
        `AI Agent run ${config.aiAgentRunId} ended as ${summary.status} for flow ${flowId}`,
      );
      const updatedConfig: ListSourceConfigShape = {
        ...config,
        aiAgentRunStatus: summary.status,
        failureReason:
          summary.status === 'cancelled'
            ? 'AI Agent run was cancelled'
            : 'AI Agent run failed',
      };
      await prisma.$transaction([
        prisma.flowNode.update({
          where: { id: sourceNodeId },
          data: { config: updatedConfig as never },
        }),
        prisma.flow.update({ where: { id: flowId }, data: { status: 'FAILED' } }),
      ]);
      return;
    }

    if (summary.status === 'completed') {
      const flow = await prisma.flow.findUnique({
        where: { id: flowId },
        select: { userId: true, organizationId: true },
      });
      if (!flow) return;

      const leads = await this.prospectingService.listRunLeads(config.aiAgentRunId);
      const imported = await this.importLeadsToContactList({
        leads,
        contactListId: config.contactListId,
        userId: flow.userId,
        organizationId: flow.organizationId,
      });

      this.logger.log(
        `Imported ${imported} contacts from AI run ${config.aiAgentRunId} into list ${config.contactListId} (flow ${flowId})`,
      );

      const updatedConfig: ListSourceConfigShape = {
        ...config,
        aiAgentRunStatus: 'completed',
      };
      await prisma.flowNode.update({
        where: { id: sourceNodeId },
        data: { config: updatedConfig as never },
      });

      // Now enroll the imported contacts
      await this.enrollNewContacts(flowId);
      return;
    }

    // Still running/pending — just update status snapshot if it changed
    if (summary.status !== config.aiAgentRunStatus) {
      const updatedConfig: ListSourceConfigShape = {
        ...config,
        aiAgentRunStatus: summary.status,
      };
      await prisma.flowNode.update({
        where: { id: sourceNodeId },
        data: { config: updatedConfig as never },
      });
    }
  }

  private async importLeadsToContactList(opts: {
    leads: LeadItem[];
    contactListId: string;
    userId: string;
    organizationId: string | null;
  }): Promise<number> {
    const { leads, contactListId, userId, organizationId } = opts;

    const eligible = leads.filter((l) => l.email && l.email.trim().length > 0);
    if (eligible.length === 0) return 0;

    const orgFilter: Prisma.ContactWhereInput = organizationId
      ? { organizationId }
      : { userId, organizationId: null };

    const existingByEmail = new Map<string, string>();
    const emails = Array.from(
      new Set(eligible.map((l) => l.email!.trim().toLowerCase())),
    );

    const existing = await prisma.contact.findMany({
      where: { ...orgFilter, email: { in: emails, mode: 'insensitive' } },
      select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true, company: true, phone: true, notes: true },
    });
    for (const c of existing) {
      if (c.email) existingByEmail.set(c.email.toLowerCase(), c.id);
    }

    const contactIds: string[] = [];

    for (const lead of eligible) {
      const email = lead.email!.trim();
      const lowered = email.toLowerCase();
      const { firstName, lastName } = this.splitLeadName(lead.name, email);
      const notes = this.formatLeadNotes(lead);

      const existingId = existingByEmail.get(lowered);
      if (existingId) {
        const current = existing.find((c) => c.id === existingId)!;
        const data: Prisma.ContactUpdateInput = {};
        if (!current.firstName && firstName) data.firstName = firstName;
        if (!current.lastName && lastName) data.lastName = lastName;
        if (!current.jobTitle && lead.title) data.jobTitle = lead.title;
        if (!current.company && lead.company_name) data.company = lead.company_name;
        if (!current.phone && lead.phone) data.phone = lead.phone;
        if (!current.notes && notes) data.notes = notes;
        if (Object.keys(data).length > 0) {
          await prisma.contact.update({ where: { id: existingId }, data });
        }
        contactIds.push(existingId);
      } else {
        const newId = randomUUID();
        await prisma.contact.create({
          data: {
            id: newId,
            firstName,
            lastName: lastName || null,
            email,
            phone: lead.phone ?? null,
            company: lead.company_name ?? null,
            jobTitle: lead.title ?? null,
            notes: notes || null,
            userId,
            organizationId,
          },
        });
        existingByEmail.set(lowered, newId);
        contactIds.push(newId);
      }
    }

    if (contactIds.length === 0) return 0;

    const entryRows = contactIds.map((contactId) => ({
      id: randomUUID(),
      contactListId,
      contactId,
    }));
    await prisma.contactListEntry.createMany({
      data: entryRows,
      skipDuplicates: true,
    });

    return contactIds.length;
  }

  private splitLeadName(
    name: string | null,
    email: string,
  ): { firstName: string; lastName: string } {
    const trimmed = name?.trim();
    if (trimmed && trimmed.length > 0) {
      const parts = trimmed.split(/\s+/);
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
      };
    }
    const localPart = email.split('@')[0] ?? email;
    return { firstName: localPart, lastName: '' };
  }

  private formatLeadNotes(lead: LeadItem): string {
    const lines: string[] = [];
    if (typeof lead.score === 'number') {
      lines.push(`Score: ${lead.score}${lead.score_reason ? ` — ${lead.score_reason}` : ''}`);
    }
    if (lead.bant) {
      const parts: string[] = [];
      if (lead.bant.budget) parts.push(`Budget: ${lead.bant.budget}`);
      if (lead.bant.authority) parts.push(`Authority: ${lead.bant.authority}`);
      if (lead.bant.need) parts.push(`Need: ${lead.bant.need}`);
      if (lead.bant.timeline) parts.push(`Timeline: ${lead.bant.timeline}`);
      if (parts.length > 0) lines.push(`BANT — ${parts.join(' | ')}`);
    }
    if (lead.suggested_angle) lines.push(`Angle: ${lead.suggested_angle}`);
    if (lead.red_flags && lead.red_flags.length > 0) {
      lines.push(`Red flags: ${lead.red_flags.join(', ')}`);
    }
    if (lead.linkedin) lines.push(`LinkedIn: ${lead.linkedin}`);
    return lines.join('\n');
  }
}
