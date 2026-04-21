import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { AuthService } from './auth.service';
import { auth } from '../lib/auth';

@Module({
  imports: [
    BetterAuthModule.forRoot({
      auth,
    }),
  ],
  providers: [AuthService],
})
export class AuthModule {}
