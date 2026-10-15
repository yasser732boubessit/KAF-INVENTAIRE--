import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL 16 via Prisma ORM');
    } catch (err: any) {
      this.logger.warn(`Could not connect to PostgreSQL immediately (${err.message}). In-memory fallback will be active if unconfigured.`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
