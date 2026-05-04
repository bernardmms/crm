import { Controller, Logger } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Roles } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { User as UserSchema } from '@prisma/client';
import { User } from 'src/auth/decorators/user.decorator';
import { ActiveOrg } from 'src/lib/active-org.decorator';
import { OrganizationService } from 'src/organization/organization.service';
import { EmailCampaignService } from './email-campaign.service';
import { AiEmailService } from './ai-email.service';

@Controller()
@Roles(['user', 'admin'])
export class EmailCampaignController {
  private readonly logger = new Logger(EmailCampaignController.name);

  constructor(
    private readonly emailCampaignService: EmailCampaignService,
    private readonly orgService: OrganizationService,
    private readonly aiEmailService: AiEmailService,
  ) {}

  @TsRestHandler(contract.emailCampaignContract.listEmailCampaigns)
  async listEmailCampaigns(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.emailCampaignContract.listEmailCampaigns,
      async () => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.emailCampaignService.listEmailCampaigns(
          user.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.emailCampaignContract.getEmailCampaign)
  async getEmailCampaign(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.emailCampaignContract.getEmailCampaign,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.emailCampaignService.getEmailCampaign(
          user.id,
          params.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.emailCampaignContract.createEmailCampaign)
  async createEmailCampaign(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.emailCampaignContract.createEmailCampaign,
      async ({ body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.emailCampaignService.createEmailCampaign(
          user.id,
          orgContext,
          body,
        );
      },
    );
  }

  @TsRestHandler(contract.emailCampaignContract.updateEmailCampaign)
  async updateEmailCampaign(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.emailCampaignContract.updateEmailCampaign,
      async ({ params, body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.emailCampaignService.updateEmailCampaign(
          user.id,
          params.id,
          orgContext,
          body,
        );
      },
    );
  }

  @TsRestHandler(contract.emailCampaignContract.deleteEmailCampaign)
  async deleteEmailCampaign(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.emailCampaignContract.deleteEmailCampaign,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.emailCampaignService.deleteEmailCampaign(
          user.id,
          params.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.emailCampaignContract.sendEmailCampaign)
  async sendEmailCampaign(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.emailCampaignContract.sendEmailCampaign,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.emailCampaignService.sendEmailCampaign(
          user.id,
          params.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.emailCampaignContract.scheduleEmailCampaign)
  async scheduleEmailCampaign(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.emailCampaignContract.scheduleEmailCampaign,
      async ({ params, body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.emailCampaignService.scheduleEmailCampaign(
          user.id,
          params.id,
          orgContext,
          body.scheduledAt,
        );
      },
    );
  }

  @TsRestHandler(contract.emailCampaignContract.generateEmailContent)
  async generateEmailContent() {
    return tsRestHandler(
      contract.emailCampaignContract.generateEmailContent,
      async ({ body }) => {
        try {
          const result = await this.aiEmailService.generateEmailContent(body);
          return { status: 200 as const, body: result };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Failed to generate email content';
          this.logger.error(`generateEmailContent failed: ${message}`, error instanceof Error ? error.stack : undefined);
          return {
            status: 500 as const,
            body: { message },
          };
        }
      },
    );
  }
}
