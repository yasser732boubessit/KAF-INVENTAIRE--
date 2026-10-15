import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerifyAssetDto } from './dto/verify-asset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post(':id')
  @Roles(UserRole.TEAM_2, UserRole.ADMIN)
  async verify(@Param('id') id: string, @Body() dto: VerifyAssetDto, @Req() req: any) {
    return this.verificationService.verifyAsset(id, dto, req.user);
  }
}
