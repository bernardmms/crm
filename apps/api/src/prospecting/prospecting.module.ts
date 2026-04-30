import { Module } from '@nestjs/common';
import { ProspectingService } from './prospecting.service';

@Module({
  providers: [ProspectingService],
  exports: [ProspectingService],
})
export class ProspectingModule {}
