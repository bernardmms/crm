import { Injectable, Logger } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { ServerInferResponses } from '@ts-rest/core';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db';
import type { OrgContext } from '../lib/org-context';
import { EmailService } from '../email/email.service';

@Injectable()
export class EmailCampaignService {
  private readonly logger = new Logger(EmailCampaignService.name);

  constructor(private readonly emailService: EmailService) {}

  private whereClause(userId: string, orgContext: OrgContext | null) {
    if (orgContext) {
      return { organizationId: orgContext.orgId };
    }
    return { userId, organizationId: null };
  }

  private computeStats(recipients: { status: string }[]) {
    return {
      total: recipients.length,
      sent: recipients.filter((r) => r.status === 'SENT').length,
      failed: recipients.filter((r) => r.status === 'FAILED').length,
      pending: recipients.filter((r) => r.status === 'PENDING').length,
      bounced: recipients.filter((r) => r.status === 'BOUNCED').length,
    };
  }

  async listEmailCampaigns(
    userId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.emailCampaignContract.listEmailCampaigns
    >
  > {
    const campaigns = await prisma.emailCampaign.findMany({
      where: this.whereClause(userId, orgContext),
      orderBy: { createdAt: 'desc' },
      include: {
        contactList: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
        recipients: { select: { status: true } },
      },
    });

    const campaignsWithStats = campaigns.map(({ recipients, ...campaign }) => ({
      ...campaign,
      stats: this.computeStats(recipients),
    }));

    return {
      status: 200 as const,
      body: { campaigns: campaignsWithStats, total: campaigns.length },
    };
  }

  async getEmailCampaign(
    userId: string,
    campaignId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.emailCampaignContract.getEmailCampaign
    >
  > {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, ...this.whereClause(userId, orgContext) },
      include: {
        contactList: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
        recipients: {
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      return {
        status: 404 as const,
        body: { message: 'Email campaign not found' },
      };
    }

    const stats = this.computeStats(campaign.recipients);

    return {
      status: 200 as const,
      body: { ...campaign, stats },
    };
  }

  async createEmailCampaign(
    userId: string,
    orgContext: OrgContext | null,
    body: {
      name: string;
      subject: string;
      htmlContent: string;
      contactListId: string;
    },
  ): Promise<
    ServerInferResponses<
      typeof contract.emailCampaignContract.createEmailCampaign
    >
  > {
    const campaign = await prisma.emailCampaign.create({
      data: {
        id: randomUUID(),
        ...body,
        userId,
        organizationId: orgContext?.orgId ?? null,
      },
      include: {
        contactList: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    });

    return { status: 201 as const, body: campaign };
  }

  async updateEmailCampaign(
    userId: string,
    campaignId: string,
    orgContext: OrgContext | null,
    body: Record<string, unknown>,
  ): Promise<
    ServerInferResponses<
      typeof contract.emailCampaignContract.updateEmailCampaign
    >
  > {
    const existing = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) {
      return {
        status: 404 as const,
        body: { message: 'Email campaign not found' },
      };
    }

    if (existing.status !== 'DRAFT') {
      return {
        status: 400 as const,
        body: {
          bodyResult: {
            issues: [
              {
                code: 'custom',
                message: 'Only draft campaigns can be edited',
                path: ['status'],
              },
            ],
            name: 'ZodError' as const,
          },
          headersResult: null,
          paramsResult: null,
          queryResult: null,
        },
      };
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: body,
      include: {
        contactList: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    });

    return { status: 200 as const, body: campaign };
  }

  async deleteEmailCampaign(
    userId: string,
    campaignId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.emailCampaignContract.deleteEmailCampaign
    >
  > {
    const existing = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) {
      return {
        status: 404 as const,
        body: { message: 'Email campaign not found' },
      };
    }

    if (existing.status !== 'DRAFT') {
      return {
        status: 404 as const,
        body: { message: 'Only draft campaigns can be deleted' },
      };
    }

    await prisma.emailCampaign.delete({ where: { id: campaignId } });
    return { status: 200 as const, body: { success: true } };
  }

  async sendEmailCampaign(
    userId: string,
    campaignId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.emailCampaignContract.sendEmailCampaign
    >
  > {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, ...this.whereClause(userId, orgContext) },
      include: {
        contactList: {
          include: {
            entries: {
              include: {
                contact: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return {
        status: 404 as const,
        body: { message: 'Email campaign not found' },
      };
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return {
        status: 400 as const,
        body: { message: 'Campaign has already been sent or is currently sending' },
      };
    }

    const contactsWithEmail = campaign.contactList.entries.filter(
      (entry) => entry.contact.email && !entry.contact.unsubscribedAt,
    );

    if (contactsWithEmail.length === 0) {
      return {
        status: 400 as const,
        body: {
          message:
            'No deliverable contacts in the selected list (all contacts are missing an email or have unsubscribed)',
        },
      };
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    // Create recipient records
    await prisma.emailCampaignContact.createMany({
      data: contactsWithEmail.map((entry) => ({
        id: randomUUID(),
        emailCampaignId: campaignId,
        contactId: entry.contact.id,
        status: 'PENDING' as const,
      })),
      skipDuplicates: true,
    });

    // Send emails asynchronously
    void this.processCampaignSend(campaignId, campaign.subject, campaign.htmlContent, contactsWithEmail);

    return {
      status: 200 as const,
      body: { message: `Sending campaign to ${contactsWithEmail.length} recipients` },
    };
  }

  async scheduleEmailCampaign(
    userId: string,
    campaignId: string,
    orgContext: OrgContext | null,
    scheduledAt: Date,
  ): Promise<
    ServerInferResponses<
      typeof contract.emailCampaignContract.scheduleEmailCampaign
    >
  > {
    const existing = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) {
      return {
        status: 404 as const,
        body: { message: 'Email campaign not found' },
      };
    }

    if (existing.status !== 'DRAFT') {
      return {
        status: 400 as const,
        body: { message: 'Only draft campaigns can be scheduled' },
      };
    }

    if (scheduledAt <= new Date()) {
      return {
        status: 400 as const,
        body: { message: 'Scheduled time must be in the future' },
      };
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SCHEDULED', scheduledAt },
      include: {
        contactList: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    });

    return { status: 200 as const, body: campaign };
  }

  /**
   * Called by the scheduler to dispatch due campaigns.
   */
  async dispatchScheduledCampaigns() {
    const dueCampaigns = await prisma.emailCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: new Date() },
      },
    });

    for (const campaign of dueCampaigns) {
      this.logger.log(`Dispatching scheduled campaign: ${campaign.id}`);
      await this.sendEmailCampaign(campaign.userId, campaign.id, null);
    }
  }

  private async processCampaignSend(
    campaignId: string,
    subject: string,
    htmlContent: string,
    contacts: { contact: { id: string; email: string | null; firstName: string } }[],
  ) {
    let allSucceeded = true;

    for (const entry of contacts) {
      if (!entry.contact.email) continue;

      const result = await this.emailService.sendEmail({
        to: entry.contact.email,
        subject,
        htmlContent,
        contactId: entry.contact.id,
      });

      await prisma.emailCampaignContact.updateMany({
        where: {
          emailCampaignId: campaignId,
          contactId: entry.contact.id,
        },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : null,
          errorMessage:
            result.error ??
            (result.skipped === 'unsubscribed' ? 'Contact unsubscribed' : null),
        },
      });

      if (!result.success && !result.skipped) {
        allSucceeded = false;
      }
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: allSucceeded ? 'SENT' : 'FAILED',
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Campaign ${campaignId} send completed. Status: ${allSucceeded ? 'SENT' : 'FAILED'}`,
    );
  }
}
