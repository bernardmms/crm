import { Module } from '@nestjs/common';
import { FlowController } from './flow.controller';
import { FlowService } from './flow.service';
import { FlowScheduler } from './flow.scheduler';
import { OrganizationModule } from 'src/organization/organization.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [OrganizationModule, EmailModule],
  controllers: [FlowController],
  providers: [FlowService, FlowScheduler],
})
export class FlowModule {}
