import { Injectable, Logger } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { ServerInferRequest, ServerInferResponses } from '@ts-rest/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request as ExpressRequest } from 'express';
import { auth } from '../lib/auth';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  async listUsers(
    req: ExpressRequest,
    query: ServerInferRequest<typeof contract.adminContract.listUsers>['query'],
  ): Promise<ServerInferResponses<typeof contract.adminContract.listUsers>> {
    const result = await auth.api.listUsers({
      query,
      headers: fromNodeHeaders(req.headers),
    });
    return {
      status: 200 as const,
      body: {
        ...result,
        users: result.users.map((u) => ({ ...u, email: u.email! })),
      },
    };
  }

  async getUser(
    req: ExpressRequest,
    userId: string,
  ): Promise<ServerInferResponses<typeof contract.adminContract.getUser>> {
    const result = await auth.api.getUser({
      query: { id: userId },
      headers: fromNodeHeaders(req.headers),
    });
    return {
      status: 200 as const,
      body: { ...result, email: result.email! },
    };
  }

  async createUser(
    req: ExpressRequest,
    body: ServerInferRequest<typeof contract.adminContract.createUser>['body'],
  ): Promise<ServerInferResponses<typeof contract.adminContract.createUser>> {
    const result = await auth.api.createUser({
      body: {
        email: body.email,
        name: body.name,
        password: body.password,
        role: body.role,
      },
      headers: fromNodeHeaders(req.headers),
    });
    return {
      status: 200 as const,
      body: { ...result.user, email: result.user.email! },
    };
  }

  async updateUser(
    req: ExpressRequest,
    userId: string,
    body: ServerInferRequest<typeof contract.adminContract.updateUser>['body'],
  ): Promise<ServerInferResponses<typeof contract.adminContract.updateUser>> {
    const result = await auth.api.adminUpdateUser({
      body: {
        data: body,
        userId: userId,
      },
      headers: fromNodeHeaders(req.headers),
    });
    return {
      status: 200 as const,
      body: { ...result, email: result.email! },
    };
  }

  async removeUser(
    req: ExpressRequest,
    userId: string,
  ): Promise<ServerInferResponses<typeof contract.adminContract.removeUser>> {
    const result = await auth.api.removeUser({
      body: { userId },
      headers: fromNodeHeaders(req.headers),
    });
    return {
      status: 200 as const,
      body: result,
    };
  }
}
