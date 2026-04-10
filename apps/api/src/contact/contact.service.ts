import { Injectable } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { ServerInferResponses } from '@ts-rest/core';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db';
import type { OrgContext } from '../lib/org-context';

@Injectable()
export class ContactService {
  private whereClause(userId: string, orgContext: OrgContext | null) {
    if (orgContext) {
      return { organizationId: orgContext.orgId };
    }
    return { userId, organizationId: null };
  }

  async listContacts(
    userId: string,
    page: number,
    limit: number,
    orgContext: OrgContext | null,
    search?: string,
  ): Promise<
    ServerInferResponses<typeof contract.contactContract.listContacts>
  > {
    const where = {
      ...this.whereClause(userId, orgContext),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { company: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      status: 200 as const,
      body: { contacts, total, page, limit },
    };
  }

  async getContact(
    userId: string,
    contactId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<typeof contract.contactContract.getContact>
  > {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, ...this.whereClause(userId, orgContext) },
    });

    if (!contact) {
      return { status: 404 as const, body: { message: 'Contact not found' } };
    }
    return { status: 200 as const, body: contact };
  }

  async createContact(
    userId: string,
    orgContext: OrgContext | null,
    body: {
      firstName: string;
      lastName?: string;
      email?: string;
      phone?: string;
      company?: string;
      jobTitle?: string;
      notes?: string;
    },
  ): Promise<
    ServerInferResponses<typeof contract.contactContract.createContact>
  > {
    const contact = await prisma.contact.create({
      data: {
        id: randomUUID(),
        ...body,
        email: body.email || null,
        userId,
        organizationId: orgContext?.orgId ?? null,
      },
    });

    return { status: 201 as const, body: contact };
  }

  async updateContact(
    userId: string,
    contactId: string,
    orgContext: OrgContext | null,
    body: Record<string, unknown>,
  ): Promise<
    ServerInferResponses<typeof contract.contactContract.updateContact>
  > {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) {
      return { status: 404 as const, body: { message: 'Contact not found' } };
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: body,
    });

    return { status: 200 as const, body: contact };
  }

  async deleteContact(
    userId: string,
    contactId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<typeof contract.contactContract.deleteContact>
  > {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) {
      return { status: 404 as const, body: { message: 'Contact not found' } };
    }

    await prisma.contact.delete({ where: { id: contactId } });
    return { status: 200 as const, body: { success: true } };
  }
}
