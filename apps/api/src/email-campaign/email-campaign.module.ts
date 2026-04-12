import { Module } from '@nestjs/common';
import { EmailCampaignController } from './email-campaign.controller';
import { EmailCampaignService } from './email-campaign.service';
import { EmailCampaignScheduler } from './email-campaign.scheduler';
import { OrganizationModule } from 'src/organization/organization.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [OrganizationModule, EmailModule],
  controllers: [EmailCampaignController],
  providers: [EmailCampaignService, EmailCampaignScheduler],
  exports: [EmailCampaignService],
})
export class EmailCampaignModule {}
