import { Controller } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Roles } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { User as UserSchema } from '@prisma/client';
import { User } from 'src/auth/decorators/user.decorator';
import { ActiveOrg } from 'src/lib/active-org.decorator';
import { OrganizationService } from 'src/organization/organization.service';
import { ContactListService } from './contact-list.service';

@Controller()
@Roles(['user', 'admin'])
export class ContactListController {
  constructor(
    private readonly contactListService: ContactListService,
    private readonly orgService: OrganizationService,
  ) {}

  @TsRestHandler(contract.contactListContract.listContactLists)
  async listContactLists(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactListContract.listContactLists,
      async () => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactListService.listContactLists(
          user.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.contactListContract.getContactList)
  async getContactList(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactListContract.getContactList,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactListService.getContactList(
          user.id,
          params.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.contactListContract.createContactList)
  async createContactList(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactListContract.createContactList,
      async ({ body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactListService.createContactList(
          user.id,
          orgContext,
          body,
        );
      },
    );
  }

  @TsRestHandler(contract.contactListContract.updateContactList)
  async updateContactList(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactListContract.updateContactList,
      async ({ params, body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactListService.updateContactList(
          user.id,
          params.id,
          orgContext,
          body,
        );
      },
    );
  }

  @TsRestHandler(contract.contactListContract.deleteContactList)
  async deleteContactList(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactListContract.deleteContactList,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactListService.deleteContactList(
          user.id,
          params.id,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.contactListContract.addContactToList)
  async addContactToList(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactListContract.addContactToList,
      async ({ params, body }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactListService.addContactToList(
          user.id,
          params.id,
          body.contactId,
          orgContext,
        );
      },
    );
  }

  @TsRestHandler(contract.contactListContract.removeContactFromList)
  async removeContactFromList(
    @User() user: UserSchema,
    @ActiveOrg() activeOrgId: string | null,
  ) {
    return tsRestHandler(
      contract.contactListContract.removeContactFromList,
      async ({ params }) => {
        const orgContext = await this.orgService.resolveOrgContext(
          activeOrgId,
          user.id,
        );
        return await this.contactListService.removeContactFromList(
          user.id,
          params.id,
          params.contactId,
          orgContext,
        );
      },
    );
  }
}
