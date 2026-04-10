import { Controller, Req } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Roles } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import type { Request as ExpressRequest } from 'express';
import { AdminService } from './admin.service';

@Controller()
@Roles(['admin'])
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @TsRestHandler(contract.adminContract.listUsers)
  async listUsers(@Req() req: ExpressRequest) {
    return tsRestHandler(
      contract.adminContract.listUsers,
      async ({ query }) => {
        return await this.adminService.listUsers(req, query ?? {});
      },
    );
  }

  @TsRestHandler(contract.adminContract.getUser)
  async getUser(@Req() req: ExpressRequest) {
    return tsRestHandler(contract.adminContract.getUser, async ({ params }) => {
      return await this.adminService.getUser(req, params.id);
    });
  }

  @TsRestHandler(contract.adminContract.createUser)
  async createUser(@Req() req: ExpressRequest) {
    return tsRestHandler(
      contract.adminContract.createUser,
      async ({ body }) => {
        return await this.adminService.createUser(req, body);
      },
    );
  }

  @TsRestHandler(contract.adminContract.updateUser)
  async updateUser(@Req() req: ExpressRequest) {
    return tsRestHandler(
      contract.adminContract.updateUser,
      async ({ params, body }) => {
        return await this.adminService.updateUser(req, params.id, body);
      },
    );
  }

  @TsRestHandler(contract.adminContract.removeUser)
  async removeUser(@Req() req: ExpressRequest) {
    return tsRestHandler(
      contract.adminContract.removeUser,
      async ({ params }) => {
        return await this.adminService.removeUser(req, params.id);
      },
    );
  }
}
