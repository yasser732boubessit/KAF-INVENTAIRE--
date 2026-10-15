import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Param, 
  Body, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    const adminActor = req.user?.username || 'ADMIN';
    return this.usersService.create(dto, adminActor);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    const adminActor = req.user?.username || 'ADMIN';
    return this.usersService.update(id, dto, adminActor);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean, @Req() req: any) {
    const adminUserId = req.user?.sub || req.user?.id;
    return this.usersService.updateStatus(id, isActive, adminUserId);
  }

  @Patch(':id/role')
  async updateRole(@Param('id') id: string, @Body('role') role: UserRole, @Req() req: any) {
    const adminUserId = req.user?.sub || req.user?.id;
    return this.usersService.updateRole(id, role, adminUserId);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @Req() req: any) {
    const adminActor = req.user?.username || 'ADMIN';
    return this.usersService.resetPassword(id, dto.newPassword, adminActor);
  }
}
