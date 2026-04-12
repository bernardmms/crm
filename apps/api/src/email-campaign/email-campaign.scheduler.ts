import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailCampaignService } from './email-campaign.service';

@Injectable()
export class EmailCampaignScheduler {
  private readonly logger = new Logger(EmailCampaignScheduler.name);

  constructor(private readonly emailCampaignService: EmailCampaignService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledCampaigns() {
    this.logger.debug('Checking for scheduled campaigns to dispatch...');
    await this.emailCampaignService.dispatchScheduledCampaigns();
  }
}
