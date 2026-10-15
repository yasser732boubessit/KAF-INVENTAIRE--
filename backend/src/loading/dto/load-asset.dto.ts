import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LoadAssetDto {
  @IsString()
  @IsNotEmpty()
  destinationBay: string;

  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @IsString()
  @IsOptional()
  containerCode?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
