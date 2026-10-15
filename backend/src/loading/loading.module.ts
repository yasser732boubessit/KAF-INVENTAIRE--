import { Module } from '@nestjs/common';
import { LoadingController } from './loading.controller';
import { LoadingService } from './loading.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LoadingController],
  providers: [LoadingService, PrismaService],
  exports: [LoadingService],
})
export class LoadingModule {}
