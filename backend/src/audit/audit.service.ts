import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(limit = 50) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: {
            select: { officialCode: true, name: true },
          },
          user: {
            select: { username: true, fullName: true, role: true },
          },
        },
      });
      return { success: true, count: logs.length, logs };
    } catch {
      return { success: true, count: 0, logs: [] };
    }
  }

  async getAssetHistory(assetId: string) {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { assetId },
        orderBy: { createdAt: 'asc' },
      });
      return { success: true, assetId, history: logs };
    } catch {
      return { success: true, assetId, history: [] };
    }
  }
}
