import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Roles(UserRole.TEAM_1, UserRole.TEAM_2, UserRole.TEAM_3, UserRole.ADMIN)
  async findAll(@Query() query: any) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.TEAM_1, UserRole.TEAM_2, UserRole.TEAM_3, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.TEAM_1, UserRole.ADMIN)
  async create(@Body() dto: CreateAssetDto, @Req() req: any) {
    return this.assetsService.create(dto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.TEAM_1, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAssetDto>, @Req() req: any) {
    return this.assetsService.update(id, dto, req.user);
  }
}
