import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { TsRestModule } from '@ts-rest/nest';
import { AuthModule } from 'src/auth/auth.module';
import { AdminModule } from 'src/admin/admin.module';
import { ContactModule } from 'src/contact/contact.module';
import { ContactListModule } from 'src/contact-list/contact-list.module';
import { OrganizationModule } from 'src/organization/organization.module';
import { CampaignDataModule } from 'src/campaign-data/campaign-data.module';
import { EmailCampaignModule } from 'src/email-campaign/email-campaign.module';
import { FlowModule } from 'src/flow/flow.module';
import { PrismaExceptionFilter } from 'src/prisma/prisma-exception.filter';
import z from 'zod';

const validate = (config: Record<string, unknown>) => {
  const envSchema = z.object({
    PORT: z.string(),
    FRONTEND_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'production', 'test']),
    BETTER_AUTH_BASE_URL: z.string().url(),
  });

  const result = envSchema.safeParse(config);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }

  return config;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    TsRestModule.register({
      validateResponses: true,
      validateRequestBody: true,
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    AdminModule,
    ContactModule,
    ContactListModule,
    OrganizationModule,
    CampaignDataModule,
    EmailCampaignModule,
    FlowModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
