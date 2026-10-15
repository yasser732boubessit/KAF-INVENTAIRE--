import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { SyncModule } from './sync/sync.module';
import { VerificationModule } from './verification/verification.module';
import { LoadingModule } from './loading/loading.module';
import { EtlModule } from './etl/etl.module';
import { AuditModule } from './audit/audit.module';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    AuthModule,
    AssetsModule,
    SyncModule,
    VerificationModule,
    LoadingModule,
    EtlModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
