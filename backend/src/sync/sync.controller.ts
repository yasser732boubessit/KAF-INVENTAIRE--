import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEAM_1, UserRole.ADMIN)
  async pushBatch(@Body() dto: SyncBatchDto, @Req() req: any) {
    return this.syncService.processBatch(dto, req.user);
  }

  @Get('status')
  async getStatus() {
    return this.syncService.getSyncStatus();
  }
}
