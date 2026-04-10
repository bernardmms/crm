import { Injectable } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { ServerInferResponses } from '@ts-rest/core';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/db';
import type { OrgContext } from '../lib/org-context';

@Injectable()
export class ContactListService {
  private whereClause(userId: string, orgContext: OrgContext | null) {
    if (orgContext) {
      return { organizationId: orgContext.orgId };
    }
    return { userId, organizationId: null };
  }

  async listContactLists(
    userId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.contactListContract.listContactLists
    >
  > {
    const lists = await prisma.contactList.findMany({
      where: this.whereClause(userId, orgContext),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { entries: true } } },
    });

    return {
      status: 200 as const,
      body: { lists, total: lists.length },
    };
  }

  async getContactList(
    userId: string,
    listId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.contactListContract.getContactList
    >
  > {
    const list = await prisma.contactList.findFirst({
      where: { id: listId, ...this.whereClause(userId, orgContext) },
      include: {
        _count: { select: { entries: true } },
        entries: {
          include: { contact: true },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!list) {
      return {
        status: 404 as const,
        body: { message: 'Contact list not found' },
      };
    }
    return { status: 200 as const, body: list };
  }

  async createContactList(
    userId: string,
    orgContext: OrgContext | null,
    body: { name: string; description?: string },
  ): Promise<
    ServerInferResponses<
      typeof contract.contactListContract.createContactList
    >
  > {
    const list = await prisma.contactList.create({
      data: {
        id: randomUUID(),
        ...body,
        userId,
        organizationId: orgContext?.orgId ?? null,
      },
      include: { _count: { select: { entries: true } } },
    });

    return { status: 201 as const, body: list };
  }

  async updateContactList(
    userId: string,
    listId: string,
    orgContext: OrgContext | null,
    body: Record<string, unknown>,
  ): Promise<
    ServerInferResponses<
      typeof contract.contactListContract.updateContactList
    >
  > {
    const existing = await prisma.contactList.findFirst({
      where: { id: listId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) {
      return {
        status: 404 as const,
        body: { message: 'Contact list not found' },
      };
    }

    const list = await prisma.contactList.update({
      where: { id: listId },
      data: body,
      include: { _count: { select: { entries: true } } },
    });

    return { status: 200 as const, body: list };
  }

  async deleteContactList(
    userId: string,
    listId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.contactListContract.deleteContactList
    >
  > {
    const existing = await prisma.contactList.findFirst({
      where: { id: listId, ...this.whereClause(userId, orgContext) },
    });

    if (!existing) {
      return {
        status: 404 as const,
        body: { message: 'Contact list not found' },
      };
    }

    await prisma.contactList.delete({ where: { id: listId } });
    return { status: 200 as const, body: { success: true } };
  }

  async addContactToList(
    userId: string,
    listId: string,
    contactId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.contactListContract.addContactToList
    >
  > {
    const list = await prisma.contactList.findFirst({
      where: { id: listId, ...this.whereClause(userId, orgContext) },
    });
    if (!list) {
      return {
        status: 404 as const,
        body: { message: 'Contact list not found' },
      };
    }

    const contactWhere = orgContext
      ? { id: contactId, organizationId: orgContext.orgId }
      : { id: contactId, userId, organizationId: null };

    const contact = await prisma.contact.findFirst({ where: contactWhere });
    if (!contact) {
      return {
        status: 404 as const,
        body: { message: 'Contact not found' },
      };
    }

    await prisma.contactListEntry.create({
      data: {
        id: randomUUID(),
        contactListId: listId,
        contactId,
      },
    });

    return { status: 201 as const, body: { success: true } };
  }

  async removeContactFromList(
    userId: string,
    listId: string,
    contactId: string,
    orgContext: OrgContext | null,
  ): Promise<
    ServerInferResponses<
      typeof contract.contactListContract.removeContactFromList
    >
  > {
    const list = await prisma.contactList.findFirst({
      where: { id: listId, ...this.whereClause(userId, orgContext) },
    });
    if (!list) {
      return {
        status: 404 as const,
        body: { message: 'Contact list not found' },
      };
    }

    const entry = await prisma.contactListEntry.findFirst({
      where: { contactListId: listId, contactId },
    });
    if (!entry) {
      return {
        status: 404 as const,
        body: { message: 'Contact not in this list' },
      };
    }

    await prisma.contactListEntry.delete({ where: { id: entry.id } });
    return { status: 200 as const, body: { success: true } };
  }
}
