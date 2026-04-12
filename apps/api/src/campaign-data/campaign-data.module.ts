import { Module } from '@nestjs/common';
import { CampaignDataController } from './campaign-data.controller';
import { CampaignDataService } from './campaign-data.service';

@Module({
  controllers: [CampaignDataController],
  providers: [CampaignDataService],
})
export class CampaignDataModule {}

