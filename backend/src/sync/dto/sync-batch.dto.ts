import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SyncBatchItemDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  officialCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  nameFr?: string;

  @IsString()
  @IsOptional()
  nameAr?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;

  @IsString()
  @IsOptional()
  rfidTag?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsNotEmpty()
  expectedBayLocation: string;

  @IsString()
  @IsOptional()
  scannedBayLocation?: string;

  @IsString()
  @IsOptional()
  workflowState?: string;

  @IsString()
  @IsOptional()
  physicalState?: string;

  @IsString()
  @IsOptional()
  inventoryStatus?: string;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsOptional()
  tamperSealIntact?: boolean;

  @IsOptional()
  weightKg?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  clientVersion?: number;
}

export class SyncBatchDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsString()
  @IsOptional()
  clientTimestamp?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBatchItemDto)
  items: SyncBatchItemDto[];
}
