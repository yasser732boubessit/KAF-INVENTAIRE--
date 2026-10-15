import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class VerifyAssetDto {
  @IsString()
  @IsNotEmpty()
  scannedBayLocation: string;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsBoolean()
  @IsOptional()
  tamperSealIntact?: boolean;

  @IsBoolean()
  @IsOptional()
  rfidMatches?: boolean;

  @IsBoolean()
  @IsOptional()
  serialMatches?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  physicalState?: string;
}
