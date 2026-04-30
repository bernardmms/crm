import { Injectable, Logger } from '@nestjs/common';
import { contract, type UnsubscribeReason } from '@repo/api-contract';
import type { ServerInferResponses } from '@ts-rest/core';
import { prisma } from '../lib/db';
import { verifyUnsubscribeToken } from '../email/unsubscribe-token';

@Injectable()
export class UnsubscribeService {
  private readonly logger = new Logger(UnsubscribeService.name);

  async getStatus(
    contactId: string,
    token: string,
  ): Promise<
    ServerInferResponses<typeof contract.unsubscribeContract.getUnsubscribeStatus>
  > {
    if (!verifyUnsubscribeToken(contactId, token)) {
      return {
        status: 404 as const,
        body: { message: 'Invalid unsubscribe link' },
      };
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { email: true, unsubscribedAt: true },
    });

    if (!contact) {
      return {
        status: 404 as const,
        body: { message: 'Contact not found' },
      };
    }

    return {
      status: 200 as const,
      body: {
        email: contact.email,
        alreadyUnsubscribed: contact.unsubscribedAt !== null,
      },
    };
  }

  async unsubscribe(
    contactId: string,
    token: string,
    reason: UnsubscribeReason | undefined,
  ): Promise<
    ServerInferResponses<typeof contract.unsubscribeContract.unsubscribe>
  > {
    if (!verifyUnsubscribeToken(contactId, token)) {
      return {
        status: 404 as const,
        body: { message: 'Invalid unsubscribe link' },
      };
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { id: true, unsubscribedAt: true },
    });

    if (!contact) {
      return {
        status: 404 as const,
        body: { message: 'Contact not found' },
      };
    }

    if (contact.unsubscribedAt) {
      return { status: 200 as const, body: { success: true } };
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        unsubscribedAt: new Date(),
        unsubscribeReason: reason ?? null,
      },
    });

    this.logger.log(
      `Contact ${contactId} unsubscribed (reason: ${reason ?? 'unspecified'})`,
    );

    return { status: 200 as const, body: { success: true } };
  }
}
