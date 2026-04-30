import { Module } from '@nestjs/common';
import { LeadAgentController } from './lead-agent.controller';
import { LeadAgentService } from './lead-agent.service';
import { OrganizationModule } from 'src/organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [LeadAgentController],
  providers: [LeadAgentService],
})
export class LeadAgentModule {}
