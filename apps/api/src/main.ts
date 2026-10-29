import * as dotenv from 'dotenv';
dotenv.config();

// Polyfill WebSocket for Node.js < 22 environments (e.g. Node 20 LTS on Render)
const wsModule = require('ws');
const ResolvedWebSocket = wsModule.default || wsModule;
if (typeof globalThis.WebSocket === 'undefined' || !globalThis.WebSocket) {
  (globalThis as any).WebSocket = ResolvedWebSocket;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
const compression = require('compression');
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Bootstrap');

  // Enable reverse proxy trust (for Render, Cloudflare, custom domain SSL termination)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Security Headers
  app.use(helmet());

  // Compression for payload optimization
  app.use(compression());

  // CORS Configuration
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        /\.netlify\.app$/.test(origin) ||
        /\.onrender\.com$/.test(origin) ||
        /(^|\.)pawarsolar\.com$/.test(origin) ||
        /(^|\.)kyrossolar\.com$/.test(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // Strict Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Solar EPC CRM API running on port ${port} on 0.0.0.0 with memory budget < 400MB`);
}

bootstrap();
