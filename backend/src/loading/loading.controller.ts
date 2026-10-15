import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { LoadingService } from './loading.service';
import { LoadAssetDto } from './dto/load-asset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('loading')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoadingController {
  constructor(private readonly loadingService: LoadingService) {}

  @Post(':id')
  @Roles(UserRole.TEAM_3, UserRole.ADMIN)
  async load(@Param('id') id: string, @Body() dto: LoadAssetDto, @Req() req: any) {
    return this.loadingService.loadAsset(id, dto, req.user);
  }
}
