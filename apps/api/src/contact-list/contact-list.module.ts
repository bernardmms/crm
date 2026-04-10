import { Module } from '@nestjs/common';
import { ContactListController } from './contact-list.controller';
import { ContactListService } from './contact-list.service';
import { OrganizationModule } from 'src/organization/organization.module';

@Module({
  imports: [OrganizationModule],
  controllers: [ContactListController],
  providers: [ContactListService],
})
export class ContactListModule {}
