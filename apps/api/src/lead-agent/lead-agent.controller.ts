import { Controller } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Roles } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { User as UserSchema } from '@prisma/client';
import { User } from 'src/auth/decorators/user.decorator';
import { ActiveOrg } from 'src/lib/active-org.decorator';
import { OrganizationService } from 'src/organization/organization.service';
import { LeadAgentService } from './lead-agent.service';

@Controller()
@Roles(['user', 'admin'])
export class LeadAgentController {
  constructor(
    private readonly leadAgentService: LeadAgentService,
    private readonly orgService: OrganizationService,
  ) {}

  @TsRestHandler(contract.leadAgentContract.listJobs)
  async listJobs() {
    return tsRestHandler(contract.leadAgentContract.listJobs, async () => {
      return await this.leadAgentService.listJobs();
    });
  }

  @TsRestHandler(contract.leadAgentContract.getJob)
  async getJob() {
    return tsRestHandler(
      contract.leadAgentContract.getJob,
      async ({ params }) => {
        return await this.leadAgentService.getJob(params.jobId);
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.deleteJob)
  async deleteJob() {
    return tsRestHandler(
      contract.leadAgentContract.deleteJob,
      async ({ params }) => {
        return await this.leadAgentService.deleteJob(params.jobId);
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.listJobCompanies)
  async listJobCompanies() {
    return tsRestHandler(
      contract.leadAgentContract.listJobCompanies,
      async ({ params }) => {
        return await this.leadAgentService.listJobCompanies(params.jobId);
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.deleteCompany)
  async deleteCompany() {
    return tsRestHandler(
      contract.leadAgentContract.deleteCompany,
      async ({ params }) => {
        return await this.leadAgentService.deleteCompany(
          params.jobId,
          params.companyId,
        );
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.listLeads)
  async listLeads() {
    return tsRestHandler(
      contract.leadAgentContract.listLeads,
      async ({ params, query }) => {
        return await this.leadAgentService.listLeads(
          params.jobId,
          query.page,
          query.limit,
          query.search,
        );
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.updateLeadStatus)
  async updateLeadStatus() {
    return tsRestHandler(
      contract.leadAgentContract.updateLeadStatus,
      async ({ params, body }) => {
        return await this.leadAgentService.updateLeadStatus(
          params.jobId,
          params.leadId,
          body.status,
        );
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.deleteLead)
  async deleteLead() {
    return tsRestHandler(
      contract.leadAgentContract.deleteLead,
      async ({ params }) => {
        return await this.leadAgentService.deleteLead(
          params.jobId,
          params.leadId,
        );
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.createJob)
  async createJob() {
    return tsRestHandler(
      contract.leadAgentContract.createJob,
      async ({ body }) => {
        return await this.leadAgentService.createJob(body);
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.getJobLiveStatus)
  async getJobLiveStatus() {
    return tsRestHandler(
      contract.leadAgentContract.getJobLiveStatus,
      async ({ params }) => {
        return await this.leadAgentService.getJobLiveStatus(params.jobId);
      },
    );
  }

  @TsRestHandler(contract.leadAgentContract.importLeads)
  async importLeads(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.leadAgentContract.importLeads,
      async ({ body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.leadAgentService.importLeads(
          user.id,
          orgContext,
          body.listId,
          body.leadIds,
        );
      },
    );
  }
}
