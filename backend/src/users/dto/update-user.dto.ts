import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
