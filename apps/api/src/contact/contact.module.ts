import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { OrganizationModule } from 'src/organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
