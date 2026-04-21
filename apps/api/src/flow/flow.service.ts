import { Injectable, Logger } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { ServerInferResponses } from '@ts-rest/core';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db';
import type { OrgContext } from '../lib/org-context';
import { EmailService } from '../email/email.service';

import type { Prisma } from '@prisma/client';

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

  constructor(private readonly emailService: EmailService) {}

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

    const config = (sourceNode.config && typeof sourceNode.config === 'object' && !Array.isArray(sourceNode.config))
      ? (sourceNode.config as Record<string, unknown>)
      : {};
    if (!config.contactListId) {
      return {
        status: 400 as const,
        body: { message: 'LIST_SOURCE node must have a contact list configured' },
      };
    }

    const hasNextNode = flow.edges.some((e) => e.sourceNodeId === sourceNode.id);
    if (!hasNextNode) {
      return {
        status: 400 as const,
        body: { message: 'Flow must have at least one step after the contact list' },
      };
    }

    await prisma.flow.update({ where: { id: flowId }, data: { status: 'ACTIVE' } });

    // Enroll existing contacts immediately
    void this.enrollNewContacts(flowId);

    const updated = await this.findFlowWithNodes(flowId);
    return { status: 200 as const, body: updated as never };
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
}
