import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { contract } from '@repo/api-contract';
import { generateOpenApi } from '@ts-rest/open-api';
import { config } from 'dotenv';
import { z } from 'zod';
import { NestExpressApplication } from '@nestjs/platform-express';

import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

config({
  path: '.env',
});

const apiEnvSchema = z.object({
  PORT: z.string(),
  FRONTEND_URL: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  BETTER_AUTH_BASE_URL: z.string(),
});

export const apiEnv = apiEnvSchema.parse(process.env);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: apiEnv.FRONTEND_URL,
    credentials: true,
  });

  const openApiDocument = generateOpenApi(contract, {
    info: {
      title: 'WeCRM API',
      version: '1.0.0',
    },
  });
  if (apiEnv.NODE_ENV !== 'production') {
    app.use('/reference', apiReference({ content: openApiDocument }));
  }

  console.log(`API is running on port ${apiEnv.PORT}`);
  await app.listen(apiEnv.PORT);
}
bootstrap();
