import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
