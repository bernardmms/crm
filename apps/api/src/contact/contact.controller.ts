import { Controller } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Roles } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { User as UserSchema } from '@prisma/client';
import { User } from 'src/auth/decorators/user.decorator';
import { ActiveOrg } from 'src/lib/active-org.decorator';
import { OrganizationService } from 'src/organization/organization.service';
import { ContactService } from './contact.service';

@Controller()
@Roles(['user', 'admin'])
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly orgService: OrganizationService,
  ) {}

  @TsRestHandler(contract.contactContract.listContacts)
  async listContacts(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactContract.listContacts,
      async ({ query }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactService.listContacts(
          user.id,
          query.page,
          query.limit,
          orgContext,
          query.search,
        );
      },
    );
  }

  @TsRestHandler(contract.contactContract.getContact)
  async getContact(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactContract.getContact,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactService.getContact(
          user.id,
          params.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.contactContract.createContact)
  async createContact(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactContract.createContact,
      async ({ body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactService.createContact(
          user.id,
          orgContext,
          body,
        );
      },
    );
  }

  @TsRestHandler(contract.contactContract.updateContact)
  async updateContact(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactContract.updateContact,
      async ({ params, body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactService.updateContact(
          user.id,
          params.id,
          orgContext,
          body,
        );
      },
    );
  }

  @TsRestHandler(contract.contactContract.deleteContact)
  async deleteContact(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactContract.deleteContact,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactService.deleteContact(
          user.id,
          params.id,
          orgContext,
        );
      },
    );
  }
}
