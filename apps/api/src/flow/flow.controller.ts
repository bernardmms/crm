import { Controller } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Roles } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { User as UserSchema } from '@prisma/client';
import { User } from 'src/auth/decorators/user.decorator';
import { ActiveOrg } from 'src/lib/active-org.decorator';
import { OrganizationService } from 'src/organization/organization.service';
import { FlowService } from './flow.service';

@Controller()
@Roles(['user', 'admin'])
export class FlowController {
  constructor(
    private readonly flowService: FlowService,
    private readonly orgService: OrganizationService,
  ) {}

  @TsRestHandler(contract.flowContract.listFlows)
  async listFlows(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.listFlows, async () => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.listFlows(user.id, orgContext);
    });
  }

  @TsRestHandler(contract.flowContract.getFlow)
  async getFlow(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.getFlow, async ({ params }) => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.getFlow(user.id, params.id, orgContext);
    });
  }

  @TsRestHandler(contract.flowContract.createFlow)
  async createFlow(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.createFlow, async ({ body }) => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.createFlow(user.id, orgContext, body);
    });
  }

  @TsRestHandler(contract.flowContract.saveFlowGraph)
  async saveFlowGraph(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.saveFlowGraph, async ({ params, body }) => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.saveFlowGraph(user.id, params.id, orgContext, body);
    });
  }

  @TsRestHandler(contract.flowContract.deleteFlow)
  async deleteFlow(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.deleteFlow, async ({ params }) => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.deleteFlow(user.id, params.id, orgContext);
    });
  }

  @TsRestHandler(contract.flowContract.activateFlow)
  async activateFlow(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.activateFlow, async ({ params }) => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.activateFlow(user.id, params.id, orgContext);
    });
  }

  @TsRestHandler(contract.flowContract.pauseFlow)
  async pauseFlow(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.pauseFlow, async ({ params }) => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.pauseFlow(user.id, params.id, orgContext);
    });
  }

  @TsRestHandler(contract.flowContract.getFlowStats)
  async getFlowStats(@User() user: UserSchema, @ActiveOrg() activeOrgId: string | null) {
    return tsRestHandler(contract.flowContract.getFlowStats, async ({ params }) => {
      const orgContext = await this.orgService.resolveOrgContext(activeOrgId, user.id);
      return this.flowService.getFlowStats(user.id, params.id, orgContext);
    });
  }
}
