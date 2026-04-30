import 'reflect-metadata';
import net from 'node:net';
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

function isPortAvailable(port: number, host = '0.0.0.0') {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();

    server.unref();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function resolveApiPort(preferredPort: number) {
  if (apiEnv.NODE_ENV !== 'development') {
    return preferredPort;
  }

  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }

  for (let port = preferredPort + 1; port <= preferredPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `Unable to find an available port between ${preferredPort} and ${preferredPort + 20}.`,
  );
}

async function bootstrap() {
  const preferredPort = Number(apiEnv.PORT);
  const resolvedPort = await resolveApiPort(preferredPort);

  if (resolvedPort !== preferredPort) {
    const resolvedBaseUrl = new URL(apiEnv.BETTER_AUTH_BASE_URL);
    resolvedBaseUrl.port = String(resolvedPort);

    process.env.PORT = String(resolvedPort);
    process.env.BETTER_AUTH_BASE_URL = resolvedBaseUrl.toString();
  }

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

  await app.listen(resolvedPort);
  console.log(`API is running on port ${resolvedPort}`);
}
bootstrap();
