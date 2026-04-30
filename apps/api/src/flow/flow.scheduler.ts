import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { prisma } from '../lib/db';
import { FlowService } from './flow.service';

@Injectable()
export class FlowScheduler {
  private readonly logger = new Logger(FlowScheduler.name);

  constructor(private readonly flowService: FlowService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleEnrollmentAdvancement() {
    this.logger.debug('Advancing active flow enrollments...');
    await this.flowService.advanceActiveEnrollments();
  }

  @Cron('*/5 * * * *')
  async handleNewContactEnrollment() {
    this.logger.debug('Checking for new contacts to enroll in active flows...');

    const activeFlows = await prisma.flow.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    for (const flow of activeFlows) {
      await this.flowService.enrollNewContacts(flow.id);
    }
  }
}
