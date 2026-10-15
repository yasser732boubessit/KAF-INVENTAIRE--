import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { EtlService } from './etl.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('etl')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EtlController {
  constructor(private readonly etlService: EtlService) {}

  @Post('import')
  @Roles(UserRole.ADMIN)
  async importMassData(@Body('items') items: any[], @Req() req: any) {
    const rawItems = Array.isArray(items) ? items : [];
    return this.etlService.importDataset(rawItems, req.user);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.TEAM_1, UserRole.TEAM_2, UserRole.TEAM_3)
  async getStats() {
    return this.etlService.getKpis();
  }
}
