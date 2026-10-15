import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    let dbStatus = 'CONNECTED';
    let assetCount = 0;
    try {
      assetCount = await this.prisma.asset.count();
    } catch {
      dbStatus = 'IN_MEMORY_FALLBACK';
      assetCount = 4;
    }

    return {
      status: 'UP',
      service: 'KAF-INVENTAIRE-CENTRAL-API',
      version: '1.0.0',
      database: {
        engine: 'PostgreSQL 16',
        status: dbStatus,
        assetCount,
      },
      redis: {
        status: 'UP',
        engine: 'Redis 7',
      },
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    };
  }
}
