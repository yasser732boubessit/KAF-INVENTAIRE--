import { Module } from '@nestjs/common';
import { EtlController } from './etl.controller';
import { EtlService } from './etl.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [EtlController],
  providers: [EtlService, PrismaService],
  exports: [EtlService],
})
export class EtlModule {}
