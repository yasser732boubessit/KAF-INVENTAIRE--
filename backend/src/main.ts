import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('KAF_INVENTAIRE_BOOTSTRAP');
  const app = await NestFactory.create(AppModule);

  // Hardening & Security
  app.use(helmet());

  // CORS for Web Portal, Electron Desktop, and PWA Mobile
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, x-device-id, x-device-api-key',
  });

  // Global prefix as defined in API Documentation: /api/v1
  app.setGlobalPrefix('api/v1');

  // DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`🚀 KAF INVENTAIRE Central API is running on port: ${port}`);
  logger.log(`📡 Endpoints available under http://localhost:${port}/api/v1`);
  logger.log(`⚙️  Active Database: ${process.env.DATABASE_URL?.split('@')[1] || 'PostgreSQL 16'}`);
}
bootstrap();
