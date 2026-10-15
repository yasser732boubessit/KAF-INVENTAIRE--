import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEAM_1, UserRole.TEAM_2, UserRole.TEAM_3)
  async getAuditLogs(@Query('limit') limit?: string) {
    return this.auditService.findAll(limit ? parseInt(limit, 10) : 50);
  }

  @Get('asset/:id')
  @Roles(UserRole.ADMIN, UserRole.TEAM_1, UserRole.TEAM_2, UserRole.TEAM_3)
  async getAssetHistory(@Param('id') id: string) {
    return this.auditService.getAssetHistory(id);
  }
}
